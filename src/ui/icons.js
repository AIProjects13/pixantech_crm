import {
  LayoutDashboard, SquareKanban, Inbox, Table2, Users, Wallet, Receipt, HandCoins, History, Upload, Settings,
  Mail, LogOut, Bell, Sun, Moon, Search, Plus, X, ChevronDown, Phone, MessageCircle, Globe, Trash2, Save, Send,
  RefreshCw, Check, TriangleAlert, Filter, Download, Ellipsis, ArrowRightLeft, UserPlus, KeyRound, Link2Off, Menu,
  Calendar, StickyNote, Hand, TrendingUp, TrendingDown, FileText, Eye, FileSpreadsheet, Building2, Zap,
  CircleDollarSign, Ban, RotateCcw,
} from 'lucide';
import { raw, esc } from './html.js';

export const ICONS = {
  dashboard: LayoutDashboard, pipeline: SquareKanban, bolsa: Inbox, tabla: Table2, users: Users, wallet: Wallet,
  receipt: Receipt, coins: HandCoins, history: History, upload: Upload, settings: Settings, mail: Mail, logout: LogOut,
  bell: Bell, sun: Sun, moon: Moon, search: Search, plus: Plus, x: X, chevron: ChevronDown, phone: Phone,
  whatsapp: MessageCircle, globe: Globe, trash: Trash2, save: Save, send: Send, refresh: RefreshCw, check: Check,
  alert: TriangleAlert, filter: Filter, download: Download, more: Ellipsis, move: ArrowRightLeft, userPlus: UserPlus,
  key: KeyRound, unlink: Link2Off, menu: Menu, calendar: Calendar, note: StickyNote, hand: Hand, up: TrendingUp,
  down: TrendingDown, file: FileText, eye: Eye, csv: FileSpreadsheet, building: Building2, zap: Zap,
  dollar: CircleDollarSign, ban: Ban, undo: RotateCcw,
};

// Lucide exporta IconNode = [[tag, attrs], …] (versiones antiguas: ['svg', attrs, children]).
const children = (n) => (Array.isArray(n) && n[0] === 'svg' ? n[2] : n);
const cache = {};

export function icon(name, size = 18) {
  const k = name + ':' + size;
  if (!cache[k]) {
    const node = ICONS[name];
    if (!node) throw new Error('Ícono desconocido: ' + name);
    const inner = children(node).map(([tag, a]) =>
      '<' + tag + Object.keys(a).map((x) => ' ' + x + '="' + esc(a[x]) + '"').join('') + '/>').join('');
    cache[k] = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  return raw(cache[k]);
}
