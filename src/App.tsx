import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Closet from "./pages/app/Closet";
import AddItem from "./pages/app/AddItem";
import ItemDetail from "./pages/app/ItemDetail";
import BuildOutfit from "./pages/app/BuildOutfit";
import Outfits from "./pages/app/Outfits";
import NewOutfit from "./pages/app/NewOutfit";
import EditOutfit from "./pages/app/EditOutfit";
import Suggest from "./pages/app/Suggest";
import Settings from "./pages/app/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="closet" element={<Closet />} />
              <Route path="closet/add" element={<AddItem />} />
              <Route path="closet/item/:id" element={<ItemDetail />} />
              <Route path="closet/item/:id/build" element={<BuildOutfit />} />
              <Route path="outfits" element={<Outfits />} />
              <Route path="outfits/new" element={<NewOutfit />} />
              <Route path="outfits/:id" element={<EditOutfit />} />
              <Route path="suggest" element={<Suggest />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
