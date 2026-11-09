import React from 'react';
import {
  Utensils,
  Car,
  Receipt,
  Film,
  HeartPulse,
  ShoppingBag,
  PiggyBank,
  MoreHorizontal,
  Briefcase,
  Gift,
  TrendingUp,
  CircleDollarSign,
} from 'lucide-react';

export interface CategoryInfo {
  name: string;
  icon: React.ReactNode;
  emoji: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  progressColor: string;
}

export function getCategoryInfo(categoryName: string): CategoryInfo {
  switch (categoryName) {
    case 'อาหารและเครื่องดื่ม':
      return {
        name: categoryName,
        icon: <Utensils className="w-4 h-4" />,
        emoji: '🍔',
        bgLight: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        progressColor: 'bg-orange-500',
      };
    case 'การเดินทาง':
      return {
        name: categoryName,
        icon: <Car className="w-4 h-4" />,
        emoji: '🚗',
        bgLight: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        progressColor: 'bg-blue-500',
      };
    case 'บิลและค่าใช้จ่ายประจำ':
      return {
        name: categoryName,
        icon: <Receipt className="w-4 h-4" />,
        emoji: '🧾',
        bgLight: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200',
        progressColor: 'bg-purple-500',
      };
    case 'ความบันเทิงและพักผ่อน':
      return {
        name: categoryName,
        icon: <Film className="w-4 h-4" />,
        emoji: '🎬',
        bgLight: 'bg-pink-50',
        textColor: 'text-pink-700',
        borderColor: 'border-pink-200',
        progressColor: 'bg-pink-500',
      };
    case 'สุขภาพและยา':
      return {
        name: categoryName,
        icon: <HeartPulse className="w-4 h-4" />,
        emoji: '💊',
        bgLight: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-200',
        progressColor: 'bg-rose-500',
      };
    case 'ของใช้และช็อปปิ้ง':
      return {
        name: categoryName,
        icon: <ShoppingBag className="w-4 h-4" />,
        emoji: '🛍️',
        bgLight: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        progressColor: 'bg-amber-500',
      };
    case 'เงินออม':
      return {
        name: categoryName,
        icon: <PiggyBank className="w-4 h-4" />,
        emoji: '🐷',
        bgLight: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        progressColor: 'bg-emerald-500',
      };
    case 'ค่าใช้จ่ายอื่นๆ':
      return {
        name: categoryName,
        icon: <MoreHorizontal className="w-4 h-4" />,
        emoji: '📦',
        bgLight: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        progressColor: 'bg-gray-500',
      };
    // Income categories
    case 'เงินเดือน / ค่าจ้าง':
      return {
        name: categoryName,
        icon: <Briefcase className="w-4 h-4" />,
        emoji: '💵',
        bgLight: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        progressColor: 'bg-emerald-500',
      };
    case 'โบนัส':
      return {
        name: categoryName,
        icon: <Gift className="w-4 h-4" />,
        emoji: '🎁',
        bgLight: 'bg-teal-50',
        textColor: 'text-teal-700',
        borderColor: 'border-teal-200',
        progressColor: 'bg-teal-500',
      };
    case 'ธุรกิจ / งานเสริม':
      return {
        name: categoryName,
        icon: <TrendingUp className="w-4 h-4" />,
        emoji: '💼',
        bgLight: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-200',
        progressColor: 'bg-indigo-500',
      };
    case 'ลงทุน / ปันผล':
      return {
        name: categoryName,
        icon: <CircleDollarSign className="w-4 h-4" />,
        emoji: '📈',
        bgLight: 'bg-cyan-50',
        textColor: 'text-cyan-700',
        borderColor: 'border-cyan-200',
        progressColor: 'bg-cyan-500',
      };
    default:
      return {
        name: categoryName,
        icon: <MoreHorizontal className="w-4 h-4" />,
        emoji: '✨',
        bgLight: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        progressColor: 'bg-gray-500',
      };
  }
}
