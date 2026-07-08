import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, KeySquare, Link as LinkIcon, LogOut, MoreVertical, Plus, RotateCcw, Trash2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { 
  useListKeys, 
  useGetKeyStats, 
  useCreateKey, 
  useDeleteKey, 
  useRevokeKey, 
  useRestoreKey,
  getListKeysQueryKey,
  getGetKeyStatsQueryKey
} from "@workspace/api-client-react";
import type { ApiKey, ApiKeyCreated } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 data-[testid]:status-badge-active">Active</Badge>;
    case "revoked":
      return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 data-[testid]:status-badge-revoked">Revoked</Badge>;
    case "expired":
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 data-[testid]:status-badge-expired">Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function Dashboard({ onLogout }: { onLogout?: () => void }) {
  const { data: stats, isLoading: statsLoading } = useGetKeyStats({ query: { queryKey: getGetKeyStatsQueryKey() } });
  const { data: keys, isLoading: keysLoading } = useListKeys({ query: { queryKey: getListKeysQueryKey() } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<ApiKeyCreated | null>(null);
  
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const createMutation = useCreateKey({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListKeysQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetKeyStatsQueryKey() });
        setCreateOpen(false);
        setNewKeyData(data);
      },
      onError: (err) => {
        toast({
          title: "Failed to create key",
          description: err.error || "An unknown error occurred",
          variant: "destructive",
        });
      }
    }
  });

  const revokeMutation = useRevokeKey({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKeysQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetKeyStatsQueryKey() });
        toast({ title: "Key revoked successfully" });
        setRevokeConfirmId(null);
      }
    }
  });

  const restoreMutation = useRestoreKey({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKeysQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetKeyStatsQueryKey() });
        toast({ title: "Key restored successfully" });
      }
    }
  });

  const deleteMutation = useDeleteKey({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKeysQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetKeyStatsQueryKey() });
        toast({ title: "Key deleted permanently" });
        setDeleteConfirmId(null);
      }
    }
  });

  const createSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    ownerId: z.string().optional(),
    expiresInDays: z.coerce.number().min(1, "Must be at least 1 day").optional().or(z.literal("").transform(() => undefined)),
  });

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      ownerId: "",
      expiresInDays: undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof createSchema>) => {
    createMutation.mutate({
      data: {
        name: values.name,
        ownerId: values.ownerId || undefined,
        expiresInDays: values.expiresInDays,
      }
    });
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description,
    });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1" data-testid="text-dashboard-title">API Keys</h1>
            <p className="text-muted-foreground text-sm" data-testid="text-dashboard-desc">Manage authentication keys for the Number Lookup service.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setCreateOpen(true)} 
              className="gap-2 font-mono font-medium tracking-wide"
              data-testid="button-open-create-modal"
            >
              <Plus className="w-4 h-4" />
              CREATE_KEY
            </Button>
            {onLogout && (
              <Button
                variant="outline"
                size="icon"
                data-testid="button-logout"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                  onLogout();
                }}
                title="Logout"
                className="border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Total Keys</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-semibold" data-testid="stat-total">{statsLoading ? "-" : stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="font-mono text-xs uppercase tracking-wider text-emerald-500/70">Active</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-semibold text-emerald-500" data-testid="stat-active">{statsLoading ? "-" : stats?.active || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="font-mono text-xs uppercase tracking-wider text-red-500/70">Revoked</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-semibold text-red-500" data-testid="stat-revoked">{statsLoading ? "-" : stats?.revoked || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="font-mono text-xs uppercase tracking-wider text-amber-500/70">Expired</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-semibold text-amber-500" data-testid="stat-expired">{statsLoading ? "-" : stats?.expired || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="rounded-md border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-mono text-xs tracking-wider">NAME / OWNER</TableHead>
                <TableHead className="font-mono text-xs tracking-wider">KEY</TableHead>
                <TableHead className="font-mono text-xs tracking-wider">STATUS</TableHead>
                <TableHead className="font-mono text-xs tracking-wider">CREATED</TableHead>
                <TableHead className="font-mono text-xs tracking-wider">EXPIRES</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keysLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-mono text-sm">
                    LOADING_KEYS...
                  </TableCell>
                </TableRow>
              ) : keys?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                        <KeySquare className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-mono text-sm" data-testid="text-empty-state">NO_KEYS_FOUND</p>
                      <Button variant="outline" onClick={() => setCreateOpen(true)} className="font-mono mt-2" data-testid="button-empty-create">
                        INIT_FIRST_KEY
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                keys?.map((key) => (
                  <TableRow key={key.id} className="border-border/50 hover:bg-muted/10 group transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground" data-testid={`text-key-name-${key.id}`}>{key.name}</span>
                        {key.ownerId && <span className="text-xs text-muted-foreground font-mono mt-0.5">{key.ownerId}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm text-foreground/90 font-mono tracking-tight" data-testid={`text-key-prefix-${key.id}`}>
                          {key.name}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(key.name, "Key copied!")}
                          data-testid={`button-copy-prefix-${key.id}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={key.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono whitespace-nowrap">
                      {format(new Date(key.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono whitespace-nowrap">
                      {key.expiresAt ? format(new Date(key.expiresAt), "MMM d, yyyy") : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-key-menu-${key.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 font-mono text-sm border-border/50">
                          <DropdownMenuItem 
                            className="cursor-pointer gap-2"
                            onClick={() => copyToClipboard(`https://yeulin-numbertoinfo.onrender.com/lookup?key=${key.name}&q=NUMBER`, "URL copied! Replace NUMBER with phone number")}
                            data-testid={`menu-copy-url-${key.id}`}
                          >
                            <LinkIcon className="w-4 h-4" />
                            Copy URL
                          </DropdownMenuItem>
                          
                          {key.status === "active" && (
                            <DropdownMenuItem 
                              className="cursor-pointer gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10"
                              onClick={() => setRevokeConfirmId(key.id)}
                              data-testid={`menu-revoke-${key.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                              REVOKE_KEY
                            </DropdownMenuItem>
                          )}
                          
                          {key.status === "revoked" && (
                            <DropdownMenuItem 
                              className="cursor-pointer gap-2 text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10"
                              onClick={() => restoreMutation.mutate({ id: key.id })}
                              data-testid={`menu-restore-${key.id}`}
                            >
                              <RotateCcw className="w-4 h-4" />
                              RESTORE_KEY
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator className="bg-border/50" />
                          <DropdownMenuItem 
                            className="cursor-pointer gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10"
                            onClick={() => setDeleteConfirmId(key.id)}
                            data-testid={`menu-delete-${key.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            DELETE_PERMANENTLY
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-0 shadow-2xl">
          {/* Modal Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <KeySquare className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">Create New API Key</DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                Fill in the details below to generate a new key.
              </DialogDescription>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">

              {/* Key Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium text-zinc-300">
                      Key Name <span className="text-emerald-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Production Bot, My App"
                        {...field}
                        className="h-10 rounded-lg border-zinc-700 bg-zinc-950 text-white placeholder-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                        data-testid="input-key-name"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Owner ID */}
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium text-zinc-300">
                      Owner ID
                      <span className="ml-2 text-xs text-zinc-600 font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. @telegram_handle, user_123"
                        {...field}
                        className="h-10 rounded-lg border-zinc-700 bg-zinc-950 text-white placeholder-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                        data-testid="input-key-owner"
                      />
                    </FormControl>
                    <p className="text-xs text-zinc-600">Telegram handle, user ID, or any identifier.</p>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Expires In Days */}
              <FormField
                control={form.control}
                name="expiresInDays"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium text-zinc-300">
                      Expires In
                      <span className="ml-2 text-xs text-zinc-600 font-normal">(optional)</span>
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Number of days"
                          {...field}
                          className="h-10 rounded-lg border-zinc-700 bg-zinc-950 text-white placeholder-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 pr-14"
                          data-testid="input-key-expires"
                        />
                      </FormControl>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">days</span>
                    </div>
                    <p className="text-xs text-zinc-600">Leave blank and the key will never expire.</p>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 h-10 rounded-lg border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 bg-transparent"
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? "Generating..." : "Generate Key"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Key Result Modal */}
      <Dialog open={!!newKeyData} onOpenChange={(open) => !open && setNewKeyData(null)}>
        <DialogContent className="w-[95vw] max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-0 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">Key Created!</DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                Copy your URL now — key will not be shown again.
              </DialogDescription>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Full Lookup URL */}
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-widest">Your Lookup URL</p>
              <div className="rounded-lg bg-zinc-950 border border-zinc-700 p-3">
                <p className="text-xs text-zinc-500 mb-1">Replace <span className="text-emerald-400">NUMBER</span> with phone number</p>
                <code className="text-emerald-400 text-xs break-all leading-relaxed" data-testid="text-new-key-url">
                  {`https://yeulin-numbertoinfo.onrender.com/lookup?key=${newKeyData?.key}&q=`}
                  <span className="bg-emerald-500/20 px-1 rounded">NUMBER</span>
                </code>
              </div>
              <Button
                className="w-full mt-2 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2"
                onClick={() => {
                  if (newKeyData?.key) {
                    copyToClipboard(
                      `https://yeulin-numbertoinfo.onrender.com/lookup?key=${newKeyData.key}&q=NUMBER`,
                      "URL copied! Replace NUMBER with phone number"
                    );
                  }
                }}
                data-testid="button-copy-new-url"
              >
                <Copy className="w-4 h-4" /> Copy URL
              </Button>
            </div>

            {/* Raw Key */}
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-widest">Raw Key (optional)</p>
              <div className="flex items-center gap-2 rounded-lg bg-zinc-950 border border-zinc-700 p-3">
                <code className="text-zinc-400 font-mono text-xs break-all flex-1" data-testid="text-new-key-value">
                  {newKeyData?.key}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-zinc-500 hover:text-white"
                  onClick={() => { if (newKeyData?.key) copyToClipboard(newKeyData.key, "Key copied"); }}
                  data-testid="button-copy-new-key"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="px-6 pb-5">
            <Button
              onClick={() => setNewKeyData(null)}
              variant="outline"
              className="w-full h-10 rounded-lg border-zinc-700 text-zinc-400 hover:text-white bg-transparent"
              data-testid="button-close-new-key"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <AlertDialog open={!!revokeConfirmId} onOpenChange={(open) => !open && setRevokeConfirmId(null)}>
        <AlertDialogContent className="border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">REVOKE_KEY?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately block all API requests using this key. 
              You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">CANCEL</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => revokeConfirmId && revokeMutation.mutate({ id: revokeConfirmId })}
              className="bg-red-500 hover:bg-red-600 text-white font-mono"
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending ? "REVOKING..." : "CONFIRM_REVOKE"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">DELETE_KEY_PERMANENTLY?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The key will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">CANCEL</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && deleteMutation.mutate({ id: deleteConfirmId })}
              className="bg-red-500 hover:bg-red-600 text-white font-mono"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "DELETING..." : "CONFIRM_DELETE"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
