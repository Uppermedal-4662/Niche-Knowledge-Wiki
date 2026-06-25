import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OrgGuard } from '../auth/org.guard';
import { MembersService } from './members.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Controller('members')
@UseGuards(AuthGuard, OrgGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.membersService.findAll((req as any).orgId);
  }

  @Post('invite')
  invite(@Req() req: Request, @Body() dto: InviteMemberDto) {
    return this.membersService.invite((req as any).orgId, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.membersService.remove((req as any).orgId, id);
  }

  @Patch(':id/role')
  updateRole(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateMemberRoleDto) {
    return this.membersService.updateRole((req as any).orgId, id, dto);
  }
}
