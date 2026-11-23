import React from 'react';
import type { IconProps } from './types';
import { AddIcon, PlusIcon } from './AddIcon';
import { AddCircleIcon, PlusCircleIcon } from './AddCircleIcon';
import { AddUserIcon, UserPlusIcon } from './AddUserIcon';
import {
  EditIcon,
  DeleteIcon,
  SearchIcon,
  SaveIcon,
  BackIcon,
  CloseIcon,
  CheckCircleIcon,
  CheckIcon,
  AlertIcon,
  AlertCircleIcon,
  InfoIcon,
  LoadingIcon,
  RefreshIcon,
  FilterIcon,
} from './ActionIcons';
import {
  UserIcon,
  UsersIcon,
  UserCheckIcon,
  UserMinusIcon,
  LockIcon,
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  MailIcon,
  PhoneIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  ShieldIcon,
  CheckSquareIcon,
} from './EntityIcons';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  MenuIcon,
  SunIcon,
  MoonIcon,
  SettingsIcon,
  LogoutIcon,
  FolderIcon,
  MessageCircleIcon,
  ConstructionIcon,
  DashboardIcon,
  ReportIcon,
  ClockIcon,
} from './NavIcons';

export const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  // Add / Plus
  'add': AddIcon,
  'plus': PlusIcon,
  'add-circle': AddCircleIcon,
  'plus-circle': PlusCircleIcon,
  'user-plus': UserPlusIcon,
  'add-user': AddUserIcon,

  // Actions
  'edit': EditIcon,
  'pencil': EditIcon,
  'delete': DeleteIcon,
  'trash': DeleteIcon,
  'search': SearchIcon,
  'save': SaveIcon,
  'back': BackIcon,
  'arrow-left': BackIcon,
  'close': CloseIcon,
  'x': CloseIcon,
  'check': CheckIcon,
  'check-circle': CheckCircleIcon,
  'alert': AlertIcon,
  'alert-circle': AlertCircleIcon,
  'warning': AlertIcon,
  'info': InfoIcon,
  'loading': LoadingIcon,
  'spinner': LoadingIcon,
  'refresh': RefreshIcon,
  'filter': FilterIcon,

  // Entities & Form
  'user': UserIcon,
  'users': UsersIcon,
  'user-check': UserCheckIcon,
  'user-minus': UserMinusIcon,
  'lock': LockIcon,
  'key': KeyIcon,
  'eye': EyeIcon,
  'eye-off': EyeOffIcon,
  'mail': MailIcon,
  'phone': PhoneIcon,
  'briefcase': BriefcaseIcon,
  'building': BuildingIcon,
  'calendar': CalendarIcon,
  'shield': ShieldIcon,
  'check-square': CheckSquareIcon,

  // Navigation
  'chevron-down': ChevronDownIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-up': ChevronUpIcon,
  'menu': MenuIcon,
  'sun': SunIcon,
  'moon': MoonIcon,
  'settings': SettingsIcon,
  'logout': LogoutIcon,
  'folder': FolderIcon,
  'message-circle': MessageCircleIcon,
  'construction': ConstructionIcon,
  'dashboard': DashboardIcon,
  'report': ReportIcon,
  'clock': ClockIcon,
};

export interface DynamicIconProps extends IconProps {
  name: string;
  fallback?: React.ComponentType<IconProps>;
}

export const Icon: React.FC<DynamicIconProps> = ({
  name,
  fallback: Fallback = ChevronRightIcon,
  ...props
}) => {
  const normalizedKey = (name || '').toLowerCase().trim().replace(/_/g, '-');
  const Component = ICON_MAP[normalizedKey] || Fallback;
  return <Component {...props} />;
};

export default Icon;
