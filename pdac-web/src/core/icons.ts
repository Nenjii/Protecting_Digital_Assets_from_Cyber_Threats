// Icons are bundled from lucide (ISC licence), so nothing is fetched at runtime.
// In slide HTML write <i data-lucide="lock"></i>; in components call icon('lock').
// Each memory phrase keeps one icon across all modules (spec 3.4, dual coding):
// see src/data/phrases.json.
import {
  createElement, createIcons,
  AlarmSmoke, AppWindow, Archive, ArrowLeft, ArrowRight, ArrowRightLeft, BadgeCheck, Ban, Banknote, BellOff,
  BookOpen, Bot, Brain, Bug, Building2, CalendarClock, Check, ChevronLeft, ChevronRight, CircleCheck,
  CircleHelp, ClipboardCheck, ClipboardList, Clock, CloudFog, Coffee, Compass, Cpu, Crosshair, Database, Dog,
  DoorOpen, ExternalLink, Eye, FileLock2, FileSpreadsheet, FileText, FileWarning, Filter, Fingerprint, Fish,
  Flame, FolderOpen, Footprints, Gauge, Gavel, Globe, Grid3x3, HandHeart, HandHelping, Handshake, HardDrive,
  Hourglass, House, Info, KeyRound, Landmark, Laptop, Layers, Lightbulb, Link, ListChecks, Lock, Mail, Mailbox,
  MailSearch, MailWarning, Megaphone, MessageCircle, MessageCircleQuestion, MessageSquareWarning, Minus,
  Monitor, Moon, Network, Paperclip, Pause, PenLine, Phone, PhoneCall, PiggyBank, Play, Plus, Power, Puzzle,
  QrCode, Quote, Recycle, Repeat, RotateCcw, Route, Router, Scale, Scan, ScanEye, ScanFace, ScrollText, Search,
  Send, Server, Share2, Shield, ShieldAlert, ShieldCheck, Siren, Skull, Smartphone, Sparkles, Split, Stamp,
  Target, Timer, Trash2, TriangleAlert, Usb, UserCheck, UserRoundSearch, Users, UserX, Vault, Video, Wallet,
  Waypoints, Wifi, Workflow, Wrench, X,
} from 'lucide';

export const ICONS = {
  AlarmSmoke, AppWindow, Archive, ArrowLeft, ArrowRight, ArrowRightLeft, BadgeCheck, Ban, Banknote, BellOff,
  BookOpen, Bot, Brain, Bug, Building2, CalendarClock, Check, ChevronLeft, ChevronRight, CircleCheck,
  CircleHelp, ClipboardCheck, ClipboardList, Clock, CloudFog, Coffee, Compass, Cpu, Crosshair, Database, Dog,
  DoorOpen, ExternalLink, Eye, FileLock2, FileSpreadsheet, FileText, FileWarning, Filter, Fingerprint, Fish,
  Flame, FolderOpen, Footprints, Gauge, Gavel, Globe, Grid3x3, HandHeart, HandHelping, Handshake, HardDrive,
  Hourglass, House, Info, KeyRound, Landmark, Laptop, Layers, Lightbulb, Link, ListChecks, Lock, Mail, Mailbox,
  MailSearch, MailWarning, Megaphone, MessageCircle, MessageCircleQuestion, MessageSquareWarning, Minus,
  Monitor, Moon, Network, Paperclip, Pause, PenLine, Phone, PhoneCall, PiggyBank, Play, Plus, Power, Puzzle,
  QrCode, Quote, Recycle, Repeat, RotateCcw, Route, Router, Scale, Scan, ScanEye, ScanFace, ScrollText, Search,
  Send, Server, Share2, Shield, ShieldAlert, ShieldCheck, Siren, Skull, Smartphone, Sparkles, Split, Stamp,
  Target, Timer, Trash2, TriangleAlert, Usb, UserCheck, UserRoundSearch, Users, UserX, Vault, Video, Wallet,
  Waypoints, Wifi, Workflow, Wrench, X,
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
