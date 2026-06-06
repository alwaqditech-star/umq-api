import { Injectable, NotFoundException } from "@nestjs/common";
import { ContactStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStatus(
    status: ContactStatus,
  ): "new" | "in_progress" | "resolved" | "closed" {
    const map: Record<
      ContactStatus,
      "new" | "in_progress" | "resolved" | "closed"
    > = {
      NEW: "new",
      IN_PROGRESS: "in_progress",
      RESOLVED: "resolved",
      CLOSED: "closed",
    };
    return map[status];
  }

  private parseStatus(status: string): ContactStatus {
    const upper = status.toUpperCase().replace("-", "_") as ContactStatus;
    if (Object.values(ContactStatus).includes(upper)) return upper;
    throw new NotFoundException("Invalid status");
  }

  private mapContact(row: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    status: ContactStatus;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? "",
      subject: row.subject,
      message: row.message,
      status: this.mapStatus(row.status),
      createdAt: row.createdAt.toISOString(),
    };
  }

  async create(data: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }) {
    const row = await this.prisma.contact.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone.replace(/[\s\-()]/g, ""),
        subject: data.subject,
        message: data.message,
      },
    });
    return { message: "Message sent successfully", id: row.id };
  }

  async findAllAdmin() {
    const items = await this.prisma.contact.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return items.map((c) => this.mapContact(c));
  }

  async findOne(id: string) {
    const row = await this.prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Contact not found");
    return this.mapContact(row);
  }

  async updateAdmin(id: string, data: { status?: string }) {
    const row = await this.prisma.contact.update({
      where: { id },
      data: {
        ...(data.status ? { status: this.parseStatus(data.status) } : {}),
      },
    });
    return this.mapContact(row);
  }

  async deleteAdmin(id: string) {
    const row = await this.prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Contact not found");
    await this.prisma.contact.delete({ where: { id } });
    return { message: "Contact deleted" };
  }
}
