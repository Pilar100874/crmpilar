import { useEffect, useState } from "react";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { EmptyState } from "@/components/ferramentas/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { useGeolocation } from "@/hooks/ferramentas/useGeolocation";
import { supabase, Profile } from "@/lib/ferramentas/supabase";
import { UserLocationMap } from "@/components/ferramentas/map/UserLocationMap";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MapPin,
  Navigation,
  Search,
  User,
  Clock,
  RefreshCw,
  Locate,
  Radio,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
} from "lucide-react";

export default function TrackingPage() {
  const { isAdmin, isAlmoxarifado, profile } = useAuth();
  const {
    latitude,
    longitude,
    isLoading,
    isTracking,
    error,
    getCurrentPosition,
    startTracking,
    stopTracking,
  } = useGeolocation();

  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const isStaff = isAdmin || isAlmoxarifado;

  useEffect(() => {
    if (isStaff) {
      fetchUsers();
    }
  }, [isStaff]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("ferr_profiles")
        .select("*")
        .not("last_location_lat", "is", null)
        .order("last_location_updated_at", { ascending: false });

      if (error) throw error;
      setUsers((data as Profile[]) || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId)
    : null;

  // View for regular users - just share their location
  if (!isStaff) {
    return (
      <MainLayout>
        <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h1 className="text-xl font-bold">Minha Localização</h1>
              <p className="text-sm text-muted-foreground">
                Compartilhe sua localização com o almoxarifado
              </p>
            </div>
          </div>

          {/* Map as main content */}
          <div className="flex-1 relative">
            {profile && (
              <UserLocationMap
                users={[
                  {
                    ...profile,
                    last_location_lat: latitude ?? profile.last_location_lat,
                    last_location_lng: longitude ?? profile.last_location_lng,
                  },
                ]}
                selectedUserId={profile.id}
                className="absolute inset-0"
              />
            )}

            {/* Floating control panel */}
            <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-80">
              <Card className="shadow-lg">
                <CardContent className="p-4 space-y-3">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isTracking ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
                      {isTracking ? (
                        <Radio className="h-5 w-5 text-green-600 animate-pulse" />
                      ) : (
                        <Navigation className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {isTracking
                          ? "Rastreando em tempo real"
                          : latitude && longitude
                          ? "Localização capturada"
                          : "Localização não compartilhada"}
                      </p>
                      {latitude && longitude && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={getCurrentPosition}
                      disabled={isLoading}
                      size="sm"
                      className="flex-1"
                    >
                      <Locate className="mr-2 h-4 w-4" />
                      {isLoading ? "Obtendo..." : "Atualizar"}
                    </Button>

                    {!isTracking ? (
                      <Button
                        variant="outline"
                        onClick={startTracking}
                        size="sm"
                        className="flex-1"
                      >
                        <Radio className="mr-2 h-4 w-4" />
                        Rastrear
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={stopTracking}
                        size="sm"
                        className="flex-1"
                      >
                        <Radio className="mr-2 h-4 w-4" />
                        Parar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // View for staff - see all users on map (full screen map focus)
  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]">
        {/* Map container - takes full available space */}
        <div className="flex-1 relative">
          <UserLocationMap
            users={filteredUsers}
            selectedUserId={selectedUserId}
            className="absolute inset-0"
          />

          {/* Floating user panel - desktop */}
          <div
            className={`hidden md:flex absolute top-4 left-4 bottom-4 z-[1000] transition-all duration-300 ${
              isPanelOpen ? "w-80" : "w-12"
            }`}
          >
            <Card className="w-full shadow-xl flex flex-col overflow-hidden bg-background/95 backdrop-blur-sm">
              {isPanelOpen ? (
                <>
                  <CardHeader className="pb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4" />
                        Usuários ({filteredUsers.length})
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={fetchUsers}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setIsPanelOpen(false)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      {isLoadingUsers ? (
                        <div className="space-y-2 p-4">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="h-14 animate-pulse rounded-lg bg-muted"
                            />
                          ))}
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum usuário com localização
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() =>
                                setSelectedUserId(
                                  selectedUserId === user.id ? null : user.id
                                )
                              }
                              className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                                selectedUserId === user.id
                                  ? "bg-primary/10 border-l-2 border-l-primary"
                                  : ""
                              }`}
                            >
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                  selectedUserId === user.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <User className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium text-sm">
                                  {user.full_name}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {user.last_location_updated_at
                                    ? formatDistanceToNow(
                                        new Date(user.last_location_updated_at),
                                        { addSuffix: true, locale: ptBR }
                                      )
                                    : "Nunca"}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </>
              ) : (
                <div className="flex flex-col items-center py-4 gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsPanelOpen(true)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">
                      {filteredUsers.length}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Mobile bottom sheet style panel */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-[1000]">
            {/* Toggle button when collapsed */}
            {!isPanelOpen && (
              <div className="p-4">
                <Button
                  onClick={() => setIsPanelOpen(true)}
                  className="w-full shadow-lg"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Ver Usuários ({filteredUsers.length})
                </Button>
              </div>
            )}

            {/* Expanded panel */}
            {isPanelOpen && (
              <Card className="rounded-b-none shadow-xl bg-background/95 backdrop-blur-sm">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" />
                      Usuários ({filteredUsers.length})
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={fetchUsers}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsPanelOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[40vh]">
                    {isLoadingUsers ? (
                      <div className="space-y-2 p-4">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-14 animate-pulse rounded-lg bg-muted"
                          />
                        ))}
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum usuário com localização
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setSelectedUserId(
                                selectedUserId === user.id ? null : user.id
                              );
                              setIsPanelOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                              selectedUserId === user.id
                                ? "bg-primary/10 border-l-2 border-l-primary"
                                : ""
                            }`}
                          >
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                selectedUserId === user.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium text-sm">
                                {user.full_name}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {user.last_location_updated_at
                                  ? formatDistanceToNow(
                                      new Date(user.last_location_updated_at),
                                      { addSuffix: true, locale: ptBR }
                                    )
                                  : "Nunca"}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Selected user info card - floating top right */}
          {selectedUser && (
            <div className="absolute top-4 right-4 hidden md:block z-[1000]">
              <Card className="w-72 shadow-lg bg-background/95 backdrop-blur-sm">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Usuário Selecionado
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedUserId(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedUser.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {selectedUser.last_location_lat?.toFixed(6)},{" "}
                      {selectedUser.last_location_lng?.toFixed(6)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Atualizado{" "}
                      {selectedUser.last_location_updated_at
                        ? formatDistanceToNow(
                            new Date(selectedUser.last_location_updated_at),
                            { addSuffix: true, locale: ptBR }
                          )
                        : "nunca"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
