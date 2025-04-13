
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dumbbell, User, MessageSquare, Calendar, LogOut, Settings } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center text-purple-700 space-x-2">
          <Dumbbell className="h-6 w-6" />
          <span className="text-xl font-bold">GymBuddy Connect</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <Link to="/matches">
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <User className="h-5 w-5 mr-2" /> Find Buddies
              </Button>
            </Link>
            <Link to="/chat">
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <MessageSquare className="h-5 w-5 mr-2" /> Messages
              </Button>
            </Link>
            <Link to="/workouts">
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Calendar className="h-5 w-5 mr-2" /> Workouts
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full w-10 h-10 p-0">
                  <span className="font-medium">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link to="/profile">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" /> Profile
                  </DropdownMenuItem>
                </Link>
                <Link to="/matches" className="md:hidden">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" /> Find Buddies
                  </DropdownMenuItem>
                </Link>
                <Link to="/chat" className="md:hidden">
                  <DropdownMenuItem className="cursor-pointer">
                    <MessageSquare className="h-4 w-4 mr-2" /> Messages
                  </DropdownMenuItem>
                </Link>
                <Link to="/workouts" className="md:hidden">
                  <DropdownMenuItem className="cursor-pointer">
                    <Calendar className="h-4 w-4 mr-2" /> Workouts
                  </DropdownMenuItem>
                </Link>
                <Link to="/settings">
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600">
                  <LogOut className="h-4 w-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Link to="/auth">
            <Button className="bg-purple-600 hover:bg-purple-700">Log In</Button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
