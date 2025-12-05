import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { performApprovalAction } from '@/app/actions/approval-actions';
import { redirect } from 'next/navigation';

export default async function ApprovalsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    // Fetch pending approvals where the user is required or has the role
    // This is a simplified query; in production, we'd need a more complex join or RPC
    // to filter by "current_step" requirements vs user's role/id.

    // For MVP: Fetch all pending instances and filter in memory or show all for admins/managers
    const { data: approvals } = await supabase
        .from('content_approval_instances')
        .select(`
      id,
      status,
      created_at,
      post:posts (
        id,
        content,
        platforms
      ),
      workflow:approval_workflows (
        name
      ),
      step:approval_workflow_steps (
        id,
        step_order,
        required_role
      )
    `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Approvals</h1>

            <div className="grid gap-4">
                {approvals?.map((approval: any) => (
                    <Card key={approval.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {approval.workflow.name} - Step {approval.step.step_order}
                            </CardTitle>
                            <div className="flex gap-2">
                                <form action={async () => {
                                    'use server';
                                    await performApprovalAction({
                                        instance_id: approval.id,
                                        step_id: approval.step.id,
                                        action: 'reject',
                                        comment: 'Rejected via dashboard'
                                    });
                                }}>
                                    <Button size="sm" variant="danger" type="submit">
                                        <X className="h-4 w-4 mr-1" />
                                        Reject
                                    </Button>
                                </form>
                                <form action={async () => {
                                    'use server';
                                    await performApprovalAction({
                                        instance_id: approval.id,
                                        step_id: approval.step.id,
                                        action: 'approve',
                                        comment: 'Approved via dashboard'
                                    });
                                }}>
                                    <Button size="sm" variant="primary" type="submit">
                                        <Check className="h-4 w-4 mr-1" />
                                        Approve
                                    </Button>
                                </form>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {approval.post.content?.text || "No content preview"}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Platforms: {approval.post.platforms?.join(', ')}
                            </p>
                        </CardContent>
                    </Card>
                ))}

                {(!approvals || approvals.length === 0) && (
                    <div className="text-center text-muted-foreground py-10">
                        No pending approvals found.
                    </div>
                )}
            </div>
        </div>
    );
}
