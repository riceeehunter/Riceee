import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(dateValue) {
  if (!dateValue) return "";
  return new Date(dateValue).toLocaleString();
}

export default function SpaceStatusCard({ status }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Shared space status</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Connected accounts</span>
          <span className="font-semibold">{status.memberCount}/2</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Partner connection</span>
          <span className={status.isConnected ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
            {status.isConnected ? "Connected" : "Waiting"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Active invite</span>
          <span className={status.hasPendingInvite ? "text-blue-600 font-semibold" : "text-muted-foreground"}>
            {status.hasPendingInvite ? "Yes" : "No"}
          </span>
        </div>
        {status.hasPendingInvite && status.pendingInviteExpiry && (
          <p className="text-xs text-muted-foreground pt-1">
            Invite expires: {formatDate(status.pendingInviteExpiry)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
