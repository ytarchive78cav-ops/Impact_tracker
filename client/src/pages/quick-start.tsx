import { useEffect } from "react";
import { useLocation } from "wouter";

import { APP_ROUTES } from "@/lib/app-routes";

export default function QuickStartPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(APP_ROUTES.login);
  }, [setLocation]);

  return null;
}
