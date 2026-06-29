import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { initTracking, trackPageView } from "@/lib/tracking";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CmsProvider } from "./contexts/CmsContext";
import { TenantProvider } from "./contexts/TenantContext";
import { CookieConsent } from "./components/CookieConsent";
import Home from "./pages/Home";
import ServicePage from "./pages/ServicePage";
import ResultPage from "./pages/ResultPage";
import Privacy from "./pages/Privacy";
import AdminPage from "./pages/AdminPage";
import CoachPage from "./pages/CoachPage";
import GuidesPage from "./pages/GuidesPage";
import GuidePage from "./pages/GuidePage";
import About from "./pages/About";

function Router() {
  const [location] = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location]);
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tjanst/:slug" component={ServicePage} />
      <Route path="/resultat/:id" component={ResultPage} />
      <Route path="/guider" component={GuidesPage} />
      <Route path="/guider/:slug" component={GuidePage} />
      <Route path="/om-oss" component={About} />
      <Route path="/integritet" component={Privacy} />
      <Route path="/coach" component={CoachPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initTracking();
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <TenantProvider>
            <CmsProvider>
              <Toaster richColors position="top-center" />
              <Router />
              <CookieConsent />
            </CmsProvider>
          </TenantProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
