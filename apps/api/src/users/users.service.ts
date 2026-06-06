import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { hashPassword } from "@umq/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    role: { name: string; slug: string };
  }) {
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
      roleSlug: user.role.slug,
      status: user.isActive ? ("active" as const) : ("inactive" as const),
      lastLogin: user.lastLoginAt?.toISOString() ?? "",
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
    return users.map((u) => this.mapUser(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return this.mapUser(user);
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("This email is already registered");
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
      },
      include: { role: true },
    });
    return this.mapUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.email) {
      const email = dto.email.toLowerCase();
      const existing = await this.prisma.user.findFirst({
        where: { email, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException("This email is already registered");
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email?.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
        isActive: dto.isActive,
      },
      include: { role: true },
    });
    return this.mapUser(user);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: "User deleted successfully" };
  }
}
