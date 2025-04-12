import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const result = await controller.register(registerDto);
      expect(result).toEqual(mockUser);
      expect(authService.register).toHaveBeenCalledWith(registerDto.email, registerDto.password);
    });

    it('should throw BadRequestException for invalid registration data', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: '123',
      };

      mockAuthService.register.mockRejectedValue(new BadRequestException());

      await expect(controller.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const tokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login(loginDto, { user: mockUser });
      expect(result).toEqual(tokens);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const result = controller.getProfile({ user: mockUser });
      expect(result).toEqual(mockUser);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens', async () => {
      const refreshTokenDto = {
        refresh_token: 'old-refresh-token',
      };

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      const result = await controller.refreshToken(refreshTokenDto);
      expect(result).toEqual(newTokens);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refresh_token);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshTokenDto = {
        refresh_token: 'invalid-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(new UnauthorizedException());

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });
}); 