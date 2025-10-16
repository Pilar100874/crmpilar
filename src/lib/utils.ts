import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FabricImage, Pattern } from "fabric";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Canvas utility functions
export const applyOffsetWrap = async (img: FabricImage) => {
  // Stub implementation - can be enhanced later
  console.log("applyOffsetWrap called", img);
};

export const applyOffsetWrapLeft = async (img: FabricImage) => {
  // Stub implementation - can be enhanced later
  console.log("applyOffsetWrapLeft called", img);
};

export const applyOffsetWrapWithCutLine = async (img: FabricImage, position: number) => {
  // Stub implementation - can be enhanced later
  console.log("applyOffsetWrapWithCutLine called", img, position);
};

export const applyPattern = async (img: FabricImage, repeatX: number, repeatY: number) => {
  // Stub implementation - can be enhanced later
  console.log("applyPattern called", img, repeatX, repeatY);
};
