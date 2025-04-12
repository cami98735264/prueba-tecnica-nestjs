import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userRepository: any;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword123',
    role: UserRole.USER,
  };

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: 'REFRESH_JWT_SERVICE',
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashedPassword123';

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(email, password);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email,
        password: hashedPassword,
        role: UserRole.USER,
      });
    });

    it('should register an admin user for admin@example.com', async () => {
      const email = 'admin@example.com';
      const password = 'password123';
      const hashedPassword = 'hashedPassword123';
      const adminUser = { ...mockUser, role: UserRole.ADMIN };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      mockUserRepository.create.mockReturnValue(adminUser);
      mockUserRepository.save.mockResolvedValue(adminUser);

      const result = await service.register(email, password);

      expect(result).toEqual(adminUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email,
        password: hashedPassword,
        role: UserRole.ADMIN,
      });
    });

    it('should throw BadRequestException when email is invalid', async () => {
      const email = 'invalid-email';
      const password = 'password123';

      await expect(service.register(email, password)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password is too short', async () => {
      const email = 'test@example.com';
      const password = '12345';

      await expect(service.register(email, password)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when email already exists', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(email, password)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUser', () => {
    it('should return user if password matches', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser(email, password);

      expect(result).toEqual({ id: mockUser.id, email: mockUser.email, role: mockUser.role });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const accessToken = 'accessToken123';
      const refreshToken = 'refreshToken123';

      mockJwtService.sign.mockReturnValueOnce(accessToken);
      mockJwtService.sign.mockReturnValueOnce(refreshToken);
      mockConfigService.get.mockReturnValue('1h');

      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens if refresh token is valid', async () => {
      const accessToken = 'newAccessToken123';
      const refreshToken = 'newRefreshToken123';
      const payload = { sub: '1', email: 'test@example.com', role: UserRole.USER };

      mockJwtService.verify.mockReturnValue(payload);
      mockJwtService.sign.mockReturnValueOnce(accessToken);
      mockJwtService.sign.mockReturnValueOnce(refreshToken);

      const result = await service.refreshToken('oldRefreshToken123');

      expect(result).toEqual({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error();
      });

      await expect(service.refreshToken('invalidToken')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.refreshToken('expiredToken')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token payload is invalid', async () => {
      mockJwtService.verify.mockReturnValue({ invalid: 'payload' });

      await expect(service.refreshToken('invalidPayloadToken')).rejects.toThrow(UnauthorizedException);
    });
  });
}); 