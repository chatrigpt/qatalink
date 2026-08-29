'use client';

/*
 * Navigation order is now owned by DashboardAppV3 itself.
 * Do not mutate DOM order from a timer: the previous 1.5 s re-application made
 * desktop sidebar entries visibly jump whenever portal tools mounted/unmounted.
 * DashboardAppV3 already starts with “Vue d’ensemble”, which is the stable
 * layout we keep.
 */
export function DashboardNavOrder(){return null}
