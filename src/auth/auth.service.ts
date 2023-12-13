import * as argon2 from 'argon2';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, LoginUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Create an user service
  async createAnUser(createUserDto: CreateUserDto): Promise<User> {
    // first we need to hash the password
    const hashedPassword = await argon2.hash(createUserDto.password);

    // then we need to create the user with the hashed password
    return await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  // Login an user and return a Json with the JWT
  async loginAnUser(loginUserDto: LoginUserDto) {
    // first we need to find the user
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginUserDto.email,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Credentials are not valid');
    }
    // then we need to compare the password
    const isPasswordValid = await argon2.verify(
      user.password,
      loginUserDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credentials are not valid');
    }
    // check the json web token
    return {
      ...user,
      access_token: this.getJsonWebToken({
        id: user.id,
        email: user.email,
        roles: user.roles,
      }),
    };
  }

  // Logout an user and remove the JWT token
  async logoutAnUser() {
    // this is beacause the JWT token should be removed in the client-side
    return {
      success: true,
      message: 'User logged out',
    };
  }

  getJsonWebToken(payload: JwtPayload) {
    const { id, email, roles } = payload;

    const token = this.jwtService.sign({
      id,
      email,
      roles,
    });

    return token;
  }
}
