// Icons are bundled from lucide (ISC licence), so nothing is fetched at runtime.
// In slide HTML write <i data-lucide="lock"></i>; in components call icon('lock').
// Each memory phrase keeps one icon across all modules (spec 3.4, dual coding):
// see src/data/phrases.json.
import {
  createElement, createIcons,
  AlarmSmoke, AppWindow, Archive, ArrowLeft, ArrowRight, ArrowRightLeft, BadgeAlert, BadgeCheck, Ban, Banknote,
  BellOff, BellRing, Binoculars, BookOpen, Bot, Brain, Briefcase, Bug, Building2, CalendarClock, Camera, Cctv,
  Check, ChevronLeft, ChevronRight, CircleCheck, CircleHelp, ClipboardCheck, ClipboardList, ClipboardPenLine,
  Clock, Cloud, CloudFog, CloudUpload, Coffee, Compass, Cpu, Crosshair, Database, Dog, DoorOpen, Download,
  ExternalLink, Eye, EyeOff, FileCheck, FileClock, FileLock, FileLock2, FileSearch, FileSpreadsheet, FileText,
  FileWarning, FileX, Filter, Fingerprint, Fish, Flag, Flame, FolderLock, FolderOpen, Footprints, Gauge, Gavel,
  Globe, Grid3x3, Hand, HandHeart, HandHelping, Handshake, HardDrive, Hourglass, House, HouseWifi, IdCard,
  Inbox, Info, Key, KeyRound, KeySquare, Landmark, Laptop, Layers, Lightbulb, Link, ListChecks, ListFilter,
  ListOrdered, Lock, LockKeyhole, LockOpen, Mail, MailSearch, MailWarning, Mailbox, MapPin, Megaphone,
  MessageCircle, MessageCircleQuestion, MessageSquareWarning, Minus, Monitor, MonitorSmartphone, Moon,
  MousePointerClick, Network, Newspaper, OctagonAlert, Paperclip, Pause, PenLine, Phone, PhoneCall, PiggyBank,
  Play, Plus, Power, Printer, Puzzle, QrCode, Quote, Radar, Recycle, RefreshCw, Repeat, RotateCcw, Route,
  Router, Rss, Scale, Scan, ScanEye, ScanFace, ScanSearch, ScrollText, Search, Send, Server, Share2, Shield,
  ShieldAlert, ShieldCheck, ShieldHalf, ShieldUser, ShieldX, Signature, Siren, Skull, Smartphone, Sparkles,
  Split, Stamp, TabletSmartphone, Target, TicketCheck, Timer, Trash2, TriangleAlert, Upload, Usb, UserCheck,
  UserCog, UserLock, UserMinus, UserPlus, UserRoundCheck, UserRoundSearch, UserRoundX, UserX, Users, Vault,
  Video, Wallet, Waypoints, Wifi, WifiOff, Workflow, Wrench,
} from 'lucide';

export const ICONS = {
  AlarmSmoke, AppWindow, Archive, ArrowLeft, ArrowRight, ArrowRightLeft, BadgeAlert, BadgeCheck, Ban, Banknote,
  BellOff, BellRing, Binoculars, BookOpen, Bot, Brain, Briefcase, Bug, Building2, CalendarClock, Camera, Cctv,
  Check, ChevronLeft, ChevronRight, CircleCheck, CircleHelp, ClipboardCheck, ClipboardList, ClipboardPenLine,
  Clock, Cloud, CloudFog, CloudUpload, Coffee, Compass, Cpu, Crosshair, Database, Dog, DoorOpen, Download,
  ExternalLink, Eye, EyeOff, FileCheck, FileClock, FileLock, FileLock2, FileSearch, FileSpreadsheet, FileText,
  FileWarning, FileX, Filter, Fingerprint, Fish, Flag, Flame, FolderLock, FolderOpen, Footprints, Gauge, Gavel,
  Globe, Grid3x3, Hand, HandHeart, HandHelping, Handshake, HardDrive, Hourglass, House, HouseWifi, IdCard,
  Inbox, Info, Key, KeyRound, KeySquare, Landmark, Laptop, Layers, Lightbulb, Link, ListChecks, ListFilter,
  ListOrdered, Lock, LockKeyhole, LockOpen, Mail, MailSearch, MailWarning, Mailbox, MapPin, Megaphone,
  MessageCircle, MessageCircleQuestion, MessageSquareWarning, Minus, Monitor, MonitorSmartphone, Moon,
  MousePointerClick, Network, Newspaper, OctagonAlert, Paperclip, Pause, PenLine, Phone, PhoneCall, PiggyBank,
  Play, Plus, Power, Printer, Puzzle, QrCode, Quote, Radar, Recycle, RefreshCw, Repeat, RotateCcw, Route,
  Router, Rss, Scale, Scan, ScanEye, ScanFace, ScanSearch, ScrollText, Search, Send, Server, Share2, Shield,
  ShieldAlert, ShieldCheck, ShieldHalf, ShieldUser, ShieldX, Signature, Siren, Skull, Smartphone, Sparkles,
  Split, Stamp, TabletSmartphone, Target, TicketCheck, Timer, Trash2, TriangleAlert, Upload, Usb, UserCheck,
  UserCog, UserLock, UserMinus, UserPlus, UserRoundCheck, UserRoundSearch, UserRoundX, UserX, Users, Vault,
  Video, Wallet, Waypoints, Wifi, WifiOff, Workflow, Wrench,
};

type IconName = keyof typeof ICONS;

const toPascal = (kebab: string) => kebab.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());

/** SVG markup for a kebab-case lucide name, for use inside component templates. */
export function icon(name: string, cls = ''): string {
  const node = ICONS[toPascal(name) as IconName];
  if (!node) {
    console.warn('[pdac] unknown icon', name);
    return '';
  }
  const svg = createElement(node);
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('lucide');
  if (cls) svg.classList.add(...cls.split(' '));
  return svg.outerHTML;
}

/** Replace every <i data-lucide="..."> under root with its SVG. */
export function renderIcons(root: HTMLElement): void {
  createIcons({ icons: ICONS, root, attrs: { 'aria-hidden': 'true' } });
}
