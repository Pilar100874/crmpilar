import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, type LucideIcon } from "lucide-react";

export interface RadialMenuItem {
  id: string | number;
  label: string;
  icon: LucideIcon;
  badge?: number;
  subItems?: RadialMenuItem[];
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
  const [activeSubMenu, setActiveSubMenu] = React.useState<RadialMenuItem | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const currentItems = activeSubMenu?.subItems || menuItems;
  const innerRadius = size / 2 - bandWidth - outerGap - outerRingWidth;
  const outerRadius = size / 2 - outerGap - outerRingWidth;
  const angleStep = (2 * Math.PI) / currentItems.length;

  const handleContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate position relative to the container
      let x = e.clientX;
      let y = e.clientY;
      
      // Ensure menu stays within bounds
      const halfSize = size / 2;
      x = Math.max(halfSize + 8, Math.min(window.innerWidth - halfSize - 8, x));
      y = Math.max(halfSize + 8, Math.min(window.innerHeight - halfSize - 8, y));
      
      setPosition({ x, y });
    }
    
    setIsOpen(true);
    setActiveSubMenu(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setHoveredIndex(null);
    setActiveSubMenu(null);
  };

  const handleBack = () => {
    setActiveSubMenu(null);
    setHoveredIndex(null);
  };

  const handleItemClick = (item: RadialMenuItem, index: number) => {
    // If item has subitems, open submenu
    if (item.subItems && item.subItems.length > 0) {
      setActiveSubMenu(item);
      setHoveredIndex(null);
      return;
    }
    
    onSelect?.(item);
    handleClose();
  };

  // Close on Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (activeSubMenu) {
          handleBack();
        } else {
          handleClose();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, activeSubMenu]);

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
      
      {createPortal(<AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[900] bg-background/40"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleClose();
              }}
            />
            
            {/* Menu */}
            <motion.div
              key={activeSubMenu ? `sub-${activeSubMenu.id}` : "main"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="menu"
              aria-label={activeSubMenu?.label || "Atalhos do Atendimento"}
              className="fixed z-[901] pointer-events-none"
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
                {currentItems.map((item, index) => {
                  const startAngle = angleStep * index - Math.PI / 2 - angleStep / 2;
                  const endAngle = startAngle + angleStep;
                  const midAngle = (startAngle + endAngle) / 2;
                  const iconRadius = (innerRadius + outerRadius) / 2;
                  const iconX = size / 2 + iconRadius * Math.cos(midAngle);
                  const iconY = size / 2 + iconRadius * Math.sin(midAngle);
                  const Icon = item.icon;
                  const isHovered = hoveredIndex === index;
                  const hasSubItems = item.subItems && item.subItems.length > 0;

                  return (
                    <g
                      key={item.id}
                      role="menuitem"
                      aria-label={item.label}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleItemClick(item, index); } }}
                      onFocus={() => setHoveredIndex(index)}
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
                        {/* Submenu indicator */}
                        {hasSubItems && (
                          <circle
                            cx={iconX + iconSize / 2 + 2}
                            cy={iconY + iconSize / 2 + 2}
                            r={4}
                            fill="hsl(var(--primary))"
                          />
                        )}
                      </motion.g>
                    </g>
                  );
                })}

                {/* Center button - Back or Close */}
                <motion.g
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={activeSubMenu ? handleBack : handleClose}
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
                      {activeSubMenu ? (
                        <ChevronLeft size={20} className="text-primary-foreground" />
                      ) : (
                        <X size={20} className="text-primary-foreground" />
                      )}
                    </div>
                  </foreignObject>
                </motion.g>
              </svg>

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 right-0 top-full mt-1 px-2 py-1 bg-popover text-popover-foreground text-xs text-center font-medium rounded-md border border-border shadow-lg break-words"
                  >
                    {currentItems[hoveredIndex]?.label}
                  </motion.div>
                )}
              </AnimatePresence>
              
            </motion.div>
          </>
        )}
      </AnimatePresence>, document.body)}
      <Button variant="outline" size="icon" aria-label="Abrir atalhos do Atendimento" title="Atalhos do Atendimento"
        className="fixed bottom-4 right-16 z-[650] h-9 w-9 rounded-full border-border bg-card shadow-md"
        onClick={() => { setPosition({ x: Math.max(size / 2 + 8, window.innerWidth - size / 2 - 16), y: Math.max(size / 2 + 8, window.innerHeight - size / 2 - 52) }); setActiveSubMenu(null); setIsOpen(true); }}>
        <span aria-hidden className="text-lg">⌘</span>
      </Button>
    </div>
  );
}
