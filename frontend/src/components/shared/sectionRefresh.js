// Lets the single refresh button in the admin top bar re-fetch the data of
// whichever module is currently open, so each module does not need its own
// duplicate refresh button.
//
// AdminDashboard fires the event; modules opt in by calling useSectionRefresh
// with their own fetch function. The event is window-scoped, so it works no
// matter how deeply a module is nested.

import { useEffect } from "react";

export const SECTION_REFRESH_EVENT = "admin:section-refresh";

export const requestSectionRefresh = () => {
  window.dispatchEvent(new CustomEvent(SECTION_REFRESH_EVENT));
};

export const useSectionRefresh = (handler) => {
  useEffect(() => {
    if (typeof handler !== "function") return undefined;
    const listener = () => handler();
    window.addEventListener(SECTION_REFRESH_EVENT, listener);
    return () => window.removeEventListener(SECTION_REFRESH_EVENT, listener);
    // Re-binding on every render keeps the listener pointing at the current
    // closure (and therefore the latest state) of the module.
  });
};
