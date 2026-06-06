import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { users: true } },
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { name: "asc" },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      usersCount: role._count.users,
      permissions: role.rolePermissions.map((rp) => rp.permission.slug),
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: true } },
        rolePermissions: { include: { permission: true } },
      },
    });
    if (!role) throw new NotFoundException("Role not found");
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      usersCount: role._count.users,
      permissions: role.rolePermissions.map((rp) => rp.permission.slug),
    };
  }

  async listPermissions() {
    return this.prisma.permission.findMany({
      where: { deletedAt: null },
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });
  }
}
