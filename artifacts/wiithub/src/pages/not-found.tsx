import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background text-foreground p-4">
      <div className="text-center space-y-6 max-w-md w-full">
        <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Channel Not Found</h1>
          <p className="text-muted-foreground text-lg">
            The page you're looking for doesn't exist on this console.
          </p>
        </div>

        <Button 
          size="lg"
          onClick={() => setLocation("/")}
          className="w-full mt-8"
        >
          Return to Studio
        </Button>
      </div>
    </div>
  );
}
