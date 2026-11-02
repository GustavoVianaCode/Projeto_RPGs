import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock_access_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should register a user successfully and persist a session', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@example.com',
      name: 'Tester',
    });
    mockPrisma.session.create.mockResolvedValue({});

    const result = await service.register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Tester',
    });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(mockPrisma.session.create).toHaveBeenCalledTimes(1);
  });

  it('should throw ConflictException if email already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'uuid-1' });

    await expect(
      service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Tester',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should fail login with incorrect password', async () => {
    const hash = await bcrypt.hash('correct_password', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@example.com',
      passwordHash: hash,
    });

    await expect(
      service.login({ email: 'test@example.com', password: 'wrong_password' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
