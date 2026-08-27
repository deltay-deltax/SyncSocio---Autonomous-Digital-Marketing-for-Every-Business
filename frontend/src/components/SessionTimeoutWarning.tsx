import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';

export const SessionTimeoutWarning = () => {
  const [show, setShow] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const checkExpiry = () => {
      
      return;
        const token = localStorage.getItem('token') || localStorage.getItem('syncsocio_profile');
        if (!token) return;
        const decoded = jwtDecode<{ exp: number }>(token);
        const remaining = decoded.exp - Math.floor(Date.now() / 1000);
        
        if (remaining <= 0) {
          handleLogout();
        } else if (remaining <= 300) {
          setTimeLeft(remaining);
          setShow(true);
        } else {
          setShow(false);
        }
      } catch (e) {
        console.error('Invalid profile data', e);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (show && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (show && timeLeft <= 0) {
      handleLogout();
    }
  }, [show, timeLeft]);

  const handleLogout = () => {
    
    localStorage.removeItem('syncsocio_profile');
    window.location.href = '/login';
  };

  const handleStayLoggedIn = async () => {
    try {
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/profile/me`, { credentials: 'include',
        headers: {  }
      });
      if (res.ok) {
        const _rawJson = await res.json();
        const data = _rawJson && _rawJson.success !== undefined ? (_rawJson.success ? _rawJson.data : _rawJson) : _rawJson;
        if (data.localStorage.getItem('syncsocio_profile')) {
          
        }
        setShow(false);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={show}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your session expires in <span className="font-bold text-foreground">{formatTime(timeLeft)}</span>. 
            Would you like to stay logged in?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 w-full sm:w-auto">
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
          <Button onClick={handleStayLoggedIn} className="w-full sm:w-auto">
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
