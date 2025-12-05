import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function WorkflowsSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: workflows } = await supabase
        .from('approval_workflows')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Approval Workflows</h1>
                    <p className="text-muted-foreground">Manage how content is approved in your workspace.</p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Workflow
                </Button>
            </div>

            <div className="grid gap-4">
                {workflows?.map((workflow) => (
                    <Card key={workflow.id}>
                        <CardHeader>
                            <CardTitle>{workflow.name}</CardTitle>
                            <CardDescription>{workflow.description || 'No description'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center">
                                <span className="text-sm bg-secondary px-2 py-1 rounded capitalize">
                                    {workflow.type.replace('_', ' ')}
                                </span>
                                <Button variant="outline" size="sm">Edit</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {(!workflows || workflows.length === 0) && (
                    <div className="text-center text-muted-foreground py-10 border rounded-lg border-dashed">
                        No workflows configured. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
