import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import Content from "@/pages/content";
import Store from "@/pages/store";
import StoreNewsfeed from "@/pages/store-newsfeed";
import StoreScratch from "@/pages/store-scratch";
import RewardSettings from "@/pages/reward-settings";
import Leaderboard from "@/pages/leaderboard";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/lib/fetch-interceptor";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/users" component={Users} />
      <Route path="/content" component={Content} />
      <Route path="/store/reels" component={Store} />
      <Route path="/store/newsfeed" component={StoreNewsfeed} />
      <Route path="/store/scratch" component={StoreScratch} />
      <Route path="/store">
        <Redirect to="/store/reels" />
      </Route>
      <Route path="/rewards/settings" component={RewardSettings} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
