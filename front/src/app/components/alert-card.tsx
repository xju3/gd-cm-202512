import { MapPin, Clock, AlertTriangle, CheckCircle, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface AlertCardProps {
  title: string;
  type: string;
  location: string;
  time: string;
  description: string;
  status: 'active' | 'resolved' | 'pending';
  level?: 1 | 2 | 3 | 4;
  onClick?: () => void;
  isSelected?: boolean;
}

export function AlertCard({ title, type, location, time, description, status, level, onClick, isSelected }: AlertCardProps) {
  const statusConfig = {
    active: {
      bg: 'bg-red-50 border-red-200',
      badge: 'bg-red-500 text-white',
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      label: '告警中',
      accentColor: 'border-l-red-500'
    },
    resolved: {
      bg: 'bg-green-50 border-green-200',
      badge: 'bg-green-500 text-white',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      label: '已解决',
      accentColor: 'border-l-green-500'
    },
    pending: {
      bg: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-500 text-white',
      icon: <AlertCircleIcon className="w-5 h-5 text-yellow-500" />,
      label: '处理中',
      accentColor: 'border-l-yellow-500'
    },
  };

  const levelConfig = {
    1: { badge: 'bg-gradient-to-r from-red-500 to-red-600 text-white', label: '一级告警', icon: '🔴' },
    2: { badge: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white', label: '二级告警', icon: '🟠' },
    3: { badge: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white', label: '三级告警', icon: '🟡' },
    4: { badge: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white', label: '四级告警', icon: '🔵' },
  };

  const config = statusConfig[status];
  const levelInfo = level ? levelConfig[level] : null;

  return (
    <Card 
      className={`cursor-pointer transition-all border-l-4 ${
        isSelected 
          ? 'border-l-blue-600 bg-blue-50 border-blue-300 shadow-xl ring-4 ring-blue-200 scale-[1.02]' 
          : `${config.accentColor} ${config.bg} hover:shadow-lg hover:scale-[1.02]`
      }`} 
      onClick={onClick}
    >
      <CardContent className="p-3 lg:p-4">
        <div className="flex items-start justify-between mb-2 lg:mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-shrink-0">
                {config.icon}
              </div>
              <h3 className="font-semibold text-sm lg:text-base leading-tight break-words line-clamp-2">{title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
              <Badge variant="outline" className="text-[10px] lg:text-xs bg-white border-gray-300 px-1.5 py-0 lg:py-0.5 h-5 lg:h-auto">
                {type}
              </Badge>
              <Badge className={`${config.badge} text-[10px] lg:text-xs px-1.5 py-0 lg:py-0.5 h-5 lg:h-auto`}>
                {config.label}
              </Badge>
              {levelInfo && (
                <Badge className={`${levelInfo.badge} text-[10px] lg:text-xs px-1.5 py-0 lg:py-0.5 h-5 lg:h-auto`}>
                  {levelInfo.icon} {levelInfo.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-1.5 lg:space-y-2 text-xs lg:text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span>{time}</span>
          </div>
          <p className="line-clamp-2 mt-1.5 lg:mt-2 text-gray-600 leading-relaxed">{description}</p>
        </div>
        <div className="mt-3 pt-3 border-t">
          <Button variant="ghost" size="sm" className="w-full text-green-600 hover:text-green-700 hover:bg-green-50">
            查看详情 →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}