import { LogOut, UserCog } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clearSession, getProfile } from '@/api/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ROLE_TEXT: Record<string, string> = {
  admin: '管理员',
  staff: '店员',
}

/** 顶栏用户菜单 */
export function UserMenu() {
  const navigate = useNavigate()
  const profile = getProfile()

  const logout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  if (!profile) {
    return (
      <Button size="sm" onClick={() => navigate('/login')}>
        登录
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none">
        <Avatar className="size-9">
          <AvatarFallback className="bg-brand-muted text-sm font-medium text-brand">
            {profile.nickname.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm sm:inline">{profile.nickname}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            <span>{profile.username}</span>
            <Badge variant="secondary" className="font-normal">
              {ROLE_TEXT[profile.role] ?? profile.role}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <UserCog className="size-4" />
            当前角色：{ROLE_TEXT[profile.role] ?? profile.role}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <LogOut className="size-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
