import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CmsProvider } from "./contexts/CmsContext";
import { CookieConsent } from "./components/CookieConsent";
import Home from "./pages/Home";
import ServicePage from "./pages/ServicePage";
import ResultPage from "./pages/ResultPage";
import Privacy from "./pages/Privacy";
import AdminPage from "./pages/AdminPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tjanst/:slug" component={ServicePage} />
      <Route path="/resultat/:id" component={ResultPage} />
      <Route path="/integritet" component={Privacy} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <CmsProvider>
            <Toaster richColors position="top-center" />
            <Router />
            <CookieConsent />
          </CmsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
