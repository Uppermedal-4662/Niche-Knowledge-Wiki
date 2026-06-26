import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { organizationId },
      include: { user: true },
    });
  }

  async invite(organizationId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found. Ask them to sign up first.');

    return this.prisma.organizationMembership.create({
      data: {
        organizationId,
        userId: user.id,
        role: (dto.role as MemberRole) ?? MemberRole.MEMBER,
      },
      include: { user: true },
    });
  }

  async remove(organizationId: string, membershipId: string) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    return this.prisma.organizationMembership.delete({ where: { id: membershipId } });
  }

  async updateRole(organizationId: string, membershipId: string, dto: UpdateMemberRoleDto) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    return this.prisma.organizationMembership.update({
      where: { id: membershipId },
      data: { role: dto.role as MemberRole },
    });
  }
}
