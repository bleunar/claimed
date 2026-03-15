# Inventory Management Guide

Tracking hardware is the heart of this system. This guide explains how to organize and manage your inventory effectively.

## Core Concepts

To understand how the system works, remember this hierarchy:
**Department** > **Location** (e.g., Lab) > **Computer Set** > **Component**
*   **Locations**: Physical rooms where hardware is kept.
*   **Computer Sets**: A logical grouping of hardware (e.g., "PC-01" which includes a CPU, Monitor, and Keyboard).
*   **Components**: The actual hardware items (RAM, HDD, Mouse, etc.).

## "Assigned" vs "Rogue" Components
*   **Assigned**: A component that is part of a **Computer Set**.
*   **Rogue (Unassigned)**: A component that is in storage and not currently assigned to any specific computer set. Check the **Rogue Only** filter on the Components page to find these!

## Tracking New Items
1.  **Check for existing**: Search by **Serial Number** first to see if the item was already logged.
2.  **Create New**: Click **New Component** and fill in the Brand, Serial Number, and Component Type.
3.  **Set Status**: Mark it as **Good** if it's new/working.
4.  **Assign (Optional)**: If the item is already in a lab, select the **Location** and **Computer Set** to assign it immediately.

## Handling Issues
*   **Broken Hardware**: Update the status to **Broken** or **Under Repair**. This helps managers plan for replacements.
*   **Moving Items**: To move a component to a different set, simply **Edit** the component and change its assigned Location and Computer Set.

> **NOTE** Use a barcode scanner in the search bar to quickly pull up a component's details if it has a physical tag!