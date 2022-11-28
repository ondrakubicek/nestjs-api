import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: AuthDto) {
    //generate password
    const hash = await argon.hash(dto.password);
    //set new user to db
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('User already exists');
        }
      }
    }
  }

  async signin(dto: AuthDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new ForbiddenException('Incorrect credentials.');

    const pwMatches = await argon.verify(user.hash, dto.password);

    if (!pwMatches) throw new ForbiddenException('Incorrect password.');

    return this.signToken(user.id, user.email);
  }

  async signToken(userId: number, email: string) {
    const token = await this.jwt.signAsync(
      { userId, email },
      { expiresIn: '15m', secret: this.config.get('JWT_SECRET') },
    );
    return {
      access_token: token,
    };
  }
}
