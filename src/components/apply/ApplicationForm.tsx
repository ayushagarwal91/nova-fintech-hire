import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApplicationFormProps {
  name: string;
  email: string;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
}

export const ApplicationForm = ({ 
  name, 
  email, 
  onNameChange, 
  onEmailChange 
}: ApplicationFormProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="John Doe"
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="john@example.com"
          className="h-12"
        />
      </div>
    </>
  );
};
