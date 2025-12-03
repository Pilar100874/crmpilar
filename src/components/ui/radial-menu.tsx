import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, type LucideIcon } from "lucide-react";

export interface RadialMenuItem {
  id: string | number;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface RadialMenuProps {
  children?: React.ReactNode;
  menuItems: RadialMenuItem[];
  size?: number;
  iconSize?: number;
  bandWidth?: number;
  innerGap?: number;
  outerGap?: number;
  outerRingWidth?: number;
  onSelect?: (item: RadialMenuItem) => void;
  className?: string;
}

export function RadialMenu({
  children,
  menuItems,
  size = 240,
  iconSize = 18,
  bandWidth = 50,
  innerGap = 8,
  outerGap = 8,
  outerRingWidth = 12,
  onSelect,
  className,
}: RadialMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const innerRadius = size / 2 - bandWidth - outerGap - outerRingWidth;
  const outerRadius = size / 2 - outerGap - outerRingWidth;
  const angleStep = (2 * Math.PI) / menuItems.length;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate position relative to the container
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // Ensure menu stays within bounds
      const halfSize = size / 2;
      x = Math.max(halfSize, Math.min(rect.width - halfSize, x));
      y = Math.max(halfSize, Math.min(rect.height - halfSize, y));
      
      setPosition({ x, y });
    }
    
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setHoveredIndex(null);
  };

  const handleItemClick = (item: RadialMenuItem, index: number) => {
    onSelect?.(item);
    handleClose();
  };

  // Close on Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Create SVG path for each menu segment
  const createArcPath = (startAngle: number, endAngle: number) => {
    const startOuter = {
      x: size / 2 + outerRadius * Math.cos(startAngle),
      y: size / 2 + outerRadius * Math.sin(startAngle),
    };
    const endOuter = {
      x: size / 2 + outerRadius * Math.cos(endAngle),
      y: size / 2 + outerRadius * Math.sin(endAngle),
    };
    const startInner = {
      x: size / 2 + innerRadius * Math.cos(endAngle),
      y: size / 2 + innerRadius * Math.sin(endAngle),
    };
    const endInner = {
      x: size / 2 + innerRadius * Math.cos(startAngle),
      y: size / 2 + innerRadius * Math.sin(startAngle),
    };

    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    return `
      M ${startOuter.x} ${startOuter.y}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}
      L ${startInner.x} ${startInner.y}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}
      Z
    `;
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      className={cn("relative", className)}
    >
      {children}
      
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/20"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleClose();
              }}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-[60] pointer-events-none"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                left: position.x - size / 2,
                top: position.y - size / 2,
                width: size,
                height: size,
              }}
            >
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="pointer-events-auto"
              >
                {/* Outer ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={size / 2 - outerGap}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth={outerRingWidth}
                  opacity={0.5}
                />
                
                {/* Menu segments */}
                {menuItems.map((item, index) => {
                  const startAngle = angleStep * index - Math.PI / 2 - angleStep / 2;
                  const endAngle = startAngle + angleStep;
                  const midAngle = (startAngle + endAngle) / 2;
                  const iconRadius = (innerRadius + outerRadius) / 2;
                  const iconX = size / 2 + iconRadius * Math.cos(midAngle);
                  const iconY = size / 2 + iconRadius * Math.sin(midAngle);
                  const Icon = item.icon;
                  const isHovered = hoveredIndex === index;

                  return (
                    <g
                      key={item.id}
                      onClick={() => handleItemClick(item, index)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="cursor-pointer"
                    >
                      <motion.path
                        d={createArcPath(startAngle, endAngle)}
                        fill={isHovered ? "hsl(var(--accent))" : "hsl(var(--card))"}
                        stroke="hsl(var(--border))"
                        strokeWidth={1}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                      />
                      <motion.g
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + index * 0.03 }}
                      >
                        <foreignObject
                          x={iconX - iconSize / 2}
                          y={iconY - iconSize / 2}
                          width={iconSize}
                          height={iconSize}
                          className="overflow-visible"
                        >
                          <div className="flex items-center justify-center w-full h-full">
                            <Icon
                              size={iconSize}
                              className={cn(
                                "transition-colors",
                                isHovered ? "text-accent-foreground" : "text-foreground"
                              )}
                            />
                          </div>
                        </foreignObject>
                        {/* Badge */}
                        {item.badge !== undefined && item.badge > 0 && (
                          <g>
                            <circle
                              cx={iconX + iconSize / 2}
                              cy={iconY - iconSize / 2}
                              r={8}
                              fill="hsl(var(--primary))"
                            />
                            <text
                              x={iconX + iconSize / 2}
                              y={iconY - iconSize / 2}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="hsl(var(--primary-foreground))"
                              fontSize={9}
                              fontWeight="bold"
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </text>
                          </g>
                        )}
                      </motion.g>
                    </g>
                  );
                })}

                {/* Center button */}
                <motion.g
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={handleClose}
                  className="cursor-pointer"
                >
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={innerRadius - innerGap}
                    fill="hsl(var(--primary))"
                    className="hover:opacity-90 transition-opacity"
                  />
                  <foreignObject
                    x={size / 2 - 12}
                    y={size / 2 - 12}
                    width={24}
                    height={24}
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      <X size={20} className="text-primary-foreground" />
                    </div>
                  </foreignObject>
                </motion.g>
              </svg>

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-1/2 -translate-x-1/2 -bottom-8 px-3 py-1.5 bg-popover text-popover-foreground text-sm font-medium rounded-md shadow-lg border whitespace-nowrap"
                  >
                    {menuItems[hoveredIndex].label}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
