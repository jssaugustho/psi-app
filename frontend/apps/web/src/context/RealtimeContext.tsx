'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useBrand } from './BrandContext';

export interface OnlineUser {
  userId: string;
  nome: string;
  sobrenome: string;
  email: string;
  avatarUrl: string | null;
  path: string;
}

export type RealtimeCallback = (event: any) => void;

interface RealtimeContextType {
  socket: Socket | null;
  onlineUsers: OnlineUser[];
  subscribe: (entity: string, callback: RealtimeCallback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { tenant } = useBrand();
  const pathname = usePathname();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const subscribersRef = useRef<Map<string, Set<RealtimeCallback>>>(new Map());

  // Conectar / desconectar WebSocket
  useEffect(() => {
    if (!user || !tenant) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Extrair base URL para o WebSocket a partir do NEXT_PUBLIC_API_URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const socketUrl = apiUrl.replace(/\/v1\/?$/, ''); // Remove '/v1' do final para usar a porta base

    const newSocket = io(socketUrl, {
      path: '/v1/socket.io',
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Conectado ao servidor de Realtime WebSocket');
      newSocket.emit('subscribe', { userId: user.id, tenantId: tenant.id });
    });

    newSocket.on('presence-list', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('realtime-event', (event: any) => {
      if (event && event.entity) {
        const callbacks = subscribersRef.current.get(event.entity);
        if (callbacks) {
          callbacks.forEach((cb) => cb(event));
        }
      }
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Desconectado do servidor de Realtime');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user, tenant]);

  // Enviar pulso de presença periódico (heartbeat)
  useEffect(() => {
    if (!socket || !user || !tenant) return;

    const sendPresencePulse = () => {
      socket.emit('presence-pulse', {
        userId: user.id,
        tenantId: tenant.id,
        nome: user.nome,
        sobrenome: user.sobrenome,
        email: user.email,
        avatarUrl: user.avatar_url || null,
        path: pathname,
      });
    };

    sendPresencePulse();
    const interval = setInterval(sendPresencePulse, 10000); // 10s

    return () => clearInterval(interval);
  }, [socket, user, tenant, pathname]);

  // Função pub/sub centralizada
  const subscribe = (entity: string, callback: RealtimeCallback) => {
    if (!subscribersRef.current.has(entity)) {
      subscribersRef.current.set(entity, new Set());
    }
    subscribersRef.current.get(entity)!.add(callback);

    // Retorna função para cancelar inscrição
    return () => {
      subscribersRef.current.get(entity)?.delete(callback);
    };
  };

  return (
    <RealtimeContext.Provider value={{ socket, onlineUsers, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime deve ser usado dentro de um RealtimeProvider');
  }
  return context;
};
