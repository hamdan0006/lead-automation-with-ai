// Messages.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageCircle,
    Menu,
    Search,
    ArrowLeft,
    X,
    AlertCircle,
    MailOpen,
    Filter,
    RefreshCw,
    Loader2,
    User,
    Linkedin,
    Send,
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import './Messages.css';
import avatr from '../../messageimgs/avatar.jpg';

// API Base URL
const API_BASE_URL = 'http://192.168.1.23:5000/api';

// Type definitions
interface Participant {
    urn: string;
    name?: string;
    headline?: string;
    distance?: string;
}

interface LinkedInConversation {
    conversation_id: string;
    latest_message?: {
        body: string;
    };
    last_activity_at: number;
    unread_count?: number;
    is_sponsored?: boolean;
    conversation_url?: string;
    participants: Participant[];
}

interface Contact {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    time: number;
    unread: number;
    important: boolean;
    conversation_urn: string;
    conversation_url?: string;
    headline: string;
    profile_urn: string;
    participants: Participant[];
    other_participant_id: string | null;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'contact';
    time: string;
    timestamp?: number;
    senderName?: string;
    senderUrn?: string;
    isSending?: boolean;
}

interface LinkedInCredentials {
    cookies: {
        JSESSIONID: string;
        li_at: string;
    };
    mailbox_urn: string;
    profile_urn: string;
}

interface CookieData {
    name: string;
    value: string;
}

interface PlatformConnection {
    platform: string;
    isActive: boolean;
    cookies: CookieData[] | string;
}

function Messages() {
    const { setIsExpanded } = useSidebar();
    // State for LinkedIn data
    const [linkedinConversations, setLinkedinConversations] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [showHeaderSearch, setShowHeaderSearch] = useState<boolean>(false);
    const [headerSearchText, setHeaderSearchText] = useState<string>('');
    const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Loading and error states
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);

    // To prevent duplicate API calls
    const [isFetchingConversations, setIsFetchingConversations] = useState<boolean>(false);
    const isFetchingRef = useRef<boolean>(false);
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // LinkedIn credentials - dynamic from database
    const [linkedinCredentials, setLinkedinCredentials] = useState<LinkedInCredentials | null>(null);

    // Helper function to get cookie value
    const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
        return null;
    };

    // Function to fetch and use platform cookies from database
    const fetchAndUsePlatformCookies = useCallback(async (): Promise<LinkedInCredentials | null> => {
        try {
            const response = await fetch('http://192.168.1.23:3000/api/platform-connections');
            if (response.ok) {
                const data = await response.json();

                if (data.success && data.data && data.data.length > 0) {
                    // Find all active LinkedIn connections and sort by updatedAt descending
                    const linkedinConnections = data.data
                        .filter((conn: any) => conn.platform === 'LINKEDIN' && conn.isActive)
                        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                    const linkedinConnection = linkedinConnections[0];

                    if (linkedinConnection && linkedinConnection.cookies) {
                        let cookieData = linkedinConnection.cookies;
                        if (typeof cookieData === 'string') {
                            cookieData = JSON.parse(cookieData);
                        }

                        let jsessionid: string | null = null;
                        let li_at: string | null = null;

                        if (Array.isArray(cookieData)) {
                            const jsessionCookie = cookieData.find((c: any) => c.name === 'JSESSIONID');
                            const liAtCookie = cookieData.find((c: any) => c.name === 'li_at');
                            jsessionid = jsessionCookie?.value?.replace(/"/g, '') || null;
                            li_at = liAtCookie?.value?.replace(/"/g, '') || null;
                        }

                        if (jsessionid && li_at) {
                            console.log('✅ Using LinkedIn cookies from database');
                            const userUrn = 'urn:li:fsd_profile:ACoAAEpWar4B_9DNsjLkDzGYCy8N5AChqrcrDq0';
                            return {
                                cookies: {
                                    JSESSIONID: jsessionid,
                                    li_at: li_at,
                                },
                                mailbox_urn: userUrn,
                                profile_urn: userUrn,
                            };
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching platform cookies:', error);
        }

        return null;
    }, []);

    // Helper function to extract profile ID from URN
    const extractProfileId = useCallback((urn: string): string | null => {
        if (!urn) return null;
        try {
            // Example URNs:
            // "urn:li:fsd_profile:ACoAAEBmju4BL8b8qPmvlxme1ScH1A9QIziUPM0"
            // "urn:li:fs_miniProfile:ACoAAEpWar4B_9DNsjLkDzGYCy8N5AChqrcrDq0"
            if (urn.includes(':')) {
                const parts = urn.split(':');
                return parts[parts.length - 1]; // Last part is the profile ID
            }
            return urn;
        } catch (error) {
            console.error('Error extracting profile ID:', error);
            return null;
        }
    }, []);

    // Function to check if sender is current user
    const isCurrentUserMessage = useCallback(
        (senderUrn: string | undefined): boolean => {
            if (!senderUrn || !linkedinCredentials) return false;
            // Extract IDs for comparison
            const senderId = extractProfileId(senderUrn);
            const currentUserId = extractProfileId(linkedinCredentials.profile_urn);
            const mailboxId = extractProfileId(linkedinCredentials.mailbox_urn);
            // Check if sender is current user (compare with both profile_urn and mailbox_urn)
            return senderId === currentUserId || senderId === mailboxId;
        },
        [linkedinCredentials, extractProfileId]
    );

    // Function to format time relatively
    const formatTime = (timestamp: number): string => {
        if (!timestamp || timestamp === 0) return 'Recently';
        const now = new Date();
        const messageDate = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);
        if (diffInSeconds < 60) {
            return `${diffInSeconds} sec ago`;
        }
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} min ago`;
        }
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }
        if (diffInDays < 30) {
            const weeks = Math.floor(diffInDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
        if (diffInDays < 365) {
            const months = Math.floor(diffInDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        }
        return messageDate.toLocaleDateString([], {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    // Format time for message display
    const formatMessageTime = (timestamp: number | string): string => {
        if (!timestamp || timestamp === 0) return 'recently';

        const ts = (typeof timestamp === 'string' && /^\d+$/.test(timestamp)) ? Number(timestamp) : timestamp;
        const date = new Date(ts);

        if (isNaN(date.getTime())) {
            console.warn('Invalid timestamp received:', timestamp);
            return 'recently';
        }

        const now = new Date();

        if (date.toDateString() !== now.toDateString()) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' +
                date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        }

        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Function to get other participant (not current user)
    const getOtherParticipant = useCallback(
        (participants: Participant[]): Participant | null => {
            if (!participants || participants.length === 0) return null;
            // Find participant who is NOT the current user
            const otherParticipant = participants.find(
                p => !isCurrentUserMessage(p.urn)
            );
            // If not found, take the first one
            return otherParticipant || participants[0];
        },
        [isCurrentUserMessage]
    );

    // ==================== API FUNCTIONS ====================
    // 1. Fetch LinkedIn Conversations (with debounce)
    const fetchLinkedinConversations = useCallback(async (): Promise<void> => {
        if (isFetchingRef.current || !linkedinCredentials) return;
        isFetchingRef.current = true;
        setIsFetchingConversations(true);
        setIsLoading(true);
        setError(null);
        try {
            const payload = {
                cookies: linkedinCredentials.cookies,
                count: 20,
                headers: {},
                last_updated_before: Date.now(),
                mailbox_urn: linkedinCredentials.mailbox_urn,
            };
            const response = await fetch(`${API_BASE_URL}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const result = await response.json();
            if (result.success && result.data) {
                const conversations: LinkedInConversation[] = result.data.conversations || [];
                // Transform conversations to contacts format
                const transformedContacts: Contact[] = conversations.map(conv => {
                    const otherParticipant = getOtherParticipant(conv.participants);
                    // If this is the currently selected contact, mark it as read locally
                    const isSelected = selectedContact && conv.conversation_id === selectedContact.conversation_urn;

                    return {
                        id: conv.conversation_id,
                        name: otherParticipant?.name || 'Unknown Contact',
                        avatar: avatr,
                        lastMessage: conv.latest_message?.body || 'No messages',
                        time: conv.last_activity_at,
                        unread: isSelected ? 0 : (conv.unread_count || 0),
                        important: conv.is_sponsored || false,
                        conversation_urn: conv.conversation_id,
                        conversation_url: conv.conversation_url,
                        headline: otherParticipant?.headline || '',
                        profile_urn: otherParticipant?.urn || '',
                        participants: conv.participants,
                        other_participant_id: extractProfileId(otherParticipant?.urn || ''),
                    };
                });
                setLinkedinConversations(transformedContacts);
                setLastSynced(new Date());
            } else {
                throw new Error(result.error || 'Failed to fetch conversations');
            }
        } catch (error: any) {
            console.error('Error fetching conversations:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
            setIsFetchingConversations(false);
            isFetchingRef.current = false;
        }
    }, [linkedinCredentials, getOtherParticipant, extractProfileId]);

    // 2. Fetch Conversation Messages - UPDATED TO PREVENT STALE STATE
    const fetchConversationMessages = useCallback(
        async (conversationUrn: string, contactInfo: Contact | null = null): Promise<void> => {
            if (!conversationUrn) {
                console.error('No conversation URN provided');
                return;
            }
            setIsLoadingMessages(true);
            setError(null);

            // Use provided contactInfo or fallback to state
            const effectiveContact = contactInfo || selectedContact;
            const contactName = effectiveContact?.name?.trim() || '';

            try {
                const payload = {
                    conversation_urn: conversationUrn,
                    cookies: linkedinCredentials!.cookies,
                    headers: {},
                    profile_urn: linkedinCredentials!.profile_urn,
                };

                console.log('Fetching messages for:', contactName || conversationUrn);

                const response = await fetch(`${API_BASE_URL}/messages/conversation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                let result: any;
                try {
                    result = await response.json();
                } catch (jsonError) {
                    const textResponse = await response.text();
                    throw new Error(`API error ${response.status}`);
                }

                if (!response.ok) {
                    throw new Error(result?.error || `API error: ${response.status}`);
                }

                if (result.success && result.data) {
                    const messagesData = result.data.messages || [];
                    const transformedMessages: Message[] = messagesData.map((msg: any) => {
                        // Check if message is from the CONTACT or from YOU
                        // APPROACH: Compare sender_name with the contact's name
                        const senderName = msg.sender_name?.trim() || '';

                        // If contactName matches senderName, it's 'contact'
                        const isFromContact = contactName !== '' && senderName === contactName;

                        const timestamp = msg.delivered_at || msg.created_at || msg.timestamp || msg.createdAt || msg.sent_at || 0;

                        return {
                            id: msg.message_urn || `msg-${Date.now()}-${Math.random()}`,
                            text: msg.text || msg.body || '',
                            sender: isFromContact ? 'contact' : 'user',
                            time: formatMessageTime(timestamp),
                            timestamp: timestamp,
                            senderName: isFromContact ? senderName : 'You',
                            senderUrn: msg.sender_urn,
                        };
                    });
                    setMessages(transformedMessages);
                } else {
                    setMessages([]);
                }
            } catch (error: any) {
                console.error('Error fetching messages:', error);
            } finally {
                setIsLoadingMessages(false);
            }
        },
        [linkedinCredentials, selectedContact]
    );

    // 3. Send Message - UPDATED
    const sendLinkedinMessage = async (conversationUrn: string, messageText: string): Promise<Message | void> => {
        if (!conversationUrn || !messageText.trim() || !selectedContact) {
            console.error('Invalid parameters for sending message');
            return;
        }
        setIsSending(true);
        setError(null);
        // Optimistic update - User's message should appear on RIGHT side
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            text: messageText,
            sender: 'user', // Always user for sent messages
            time: new Date().toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }),
            isSending: true,
            timestamp: Date.now(),
            senderName: 'You',
            senderUrn: linkedinCredentials!.profile_urn,
        };
        setMessages(prev => [...prev, tempMessage]);
        try {
            // Find the other participant (not the current user)
            const otherParticipant = selectedContact.participants?.find(
                p => p.urn !== linkedinCredentials!.profile_urn && p.distance !== 'SELF'
            );
            if (!otherParticipant) {
                throw new Error('Could not find target participant');
            }
            // Try to extract messaging member ID from conversation URN
            let targetUserId: string | null = null;
            if (selectedContact.conversation_urn) {
                const match = selectedContact.conversation_urn.match(/2-([A-Za-z0-9+/=]+)/);
                if (match && match[1]) {
                    targetUserId = `2-${match[1]}`;
                }
            }
            // Fallback to profile ID
            if (!targetUserId) {
                const targetUserIdMatch = otherParticipant.urn.match(/ACoAA[^:]+$/);
                targetUserId = targetUserIdMatch ? targetUserIdMatch[0] : otherParticipant.urn;
            }
            // Extract user_id from profile_urn
            const userIdMatch = linkedinCredentials!.profile_urn.match(/ACoAA[^:]+$/);
            const userId = userIdMatch ? userIdMatch[0] : linkedinCredentials!.profile_urn;
            // Prepare payload according to API specification
            const payload = {
                jsessionid: linkedinCredentials!.cookies.JSESSIONID,
                li_at: linkedinCredentials!.cookies.li_at,
                message: messageText,
                target_user_id: targetUserId,
                user_id: userId,
            };
            const response = await fetch(`${API_BASE_URL}/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            // Try to get the response body
            let result: any;
            try {
                result = await response.json();
            } catch (jsonError) {
                const textResponse = await response.text();
                throw new Error(`Invalid response format from server`);
            }
            if (!response.ok) {
                const errorMsg = result.error || result.message || `LinkedIn API error: ${response.status}`;
                throw new Error(errorMsg);
            }
            if (result.success && result.data) {
                // Replace temp message with real one
                const sentTimestamp = result.data.delivered_at || result.data.created_at || result.data.timestamp || Date.now();
                const newMessage: Message = {
                    id: result.data.message_urn || `sent-${Date.now()}`,
                    text: result.data.text || messageText,
                    sender: 'user',
                    time: formatMessageTime(sentTimestamp),
                    timestamp: sentTimestamp,
                    senderName: 'You',
                    senderUrn: linkedinCredentials!.profile_urn,
                };
                setMessages(prev =>
                    prev.map(msg => (msg.id === tempMessage.id ? newMessage : msg))
                );

                // Clear unread count locally for immediate feedback after sending
                setLinkedinConversations(prev =>
                    prev.map(c =>
                        c.conversation_urn === conversationUrn ? { ...c, unread: 0 } : c
                    )
                );

                // Refresh messages after 3 seconds
                setTimeout(() => {
                    fetchConversationMessages(conversationUrn, selectedContact);
                }, 3000);
                return newMessage;
            } else {
                throw new Error(result.error || 'Failed to send message');
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            // Remove temp message on error
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
            setError(error.message);
            throw error;
        } finally {
            setIsSending(false);
        }
    };

    // ==================== EVENT HANDLERS ====================
    // Handle contact click
    const handleContactClick = async (contact: Contact): Promise<void> => {
        console.log('Contact clicked:', contact);
        setSelectedContact(contact);
        setMessages([]); // Clear previous messages

        // Clear unread count locally for immediate feedback
        setLinkedinConversations(prev =>
            prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c)
        );

        // Pass contact explicitly to prevent stale state issues
        await fetchConversationMessages(contact.conversation_urn, contact);
    };

    // Handle sending a message
    const handleSendMessage = async (): Promise<void> => {
        if (!inputMessage.trim() || !selectedContact) {
            console.log('Cannot send: no message or contact selected');
            return;
        }
        try {
            await sendLinkedinMessage(selectedContact.conversation_urn, inputMessage);
            setInputMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Clear search query
    const handleClearSearch = (): void => {
        setSearchQuery('');
    };

    // Sync with LinkedIn
    const handleSyncLinkedin = async (): Promise<void> => {
        await fetchLinkedinConversations();
    };

    // Apply filter function
    const applyFilter = (filterType: string): void => {
        setActiveFilter(filterType);
        setMenuOpen(false);
    };

    // Clear filter
    const clearFilter = (): void => {
        setActiveFilter('all');
    };

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    const scrollToBottom = (): void => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Handle click outside menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent): void => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search in messages
    useEffect(() => {
        if (!headerSearchText.trim()) return;
        const search = headerSearchText.toLowerCase();
        const found = messages.find(msg => msg.text.toLowerCase().includes(search));
        if (found && messageRefs.current[found.id]) {
            messageRefs.current[found.id]!.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [headerSearchText]);

    // Load conversations on mount - ONLY ONCE
    useEffect(() => {
        setIsExpanded(false);
        const initializeCredentials = async (): Promise<void> => {
            const credentials = await fetchAndUsePlatformCookies();
            if (credentials) {
                setLinkedinCredentials(credentials);
            }
        };

        initializeCredentials();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [fetchAndUsePlatformCookies]);

    // Load conversations when credentials are ready
    useEffect(() => {
        if (linkedinCredentials) {
            fetchLinkedinConversations();
        }
    }, [linkedinCredentials, fetchLinkedinConversations]);

    // Setup polling for selected conversation only
    useEffect(() => {
        // Clear previous interval
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
        if (selectedContact) {
            // Poll for new messages every 60 seconds for selected conversation
            pollingIntervalRef.current = setInterval(() => {
                fetchConversationMessages(selectedContact.conversation_urn, selectedContact);
            }, 60000);
        }
        // Cleanup on unmount or when selectedContact changes
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [selectedContact, fetchConversationMessages]);

    // Filter contacts based on active filter and search query
    const filteredContacts = linkedinConversations.filter(contact => {
        // Apply active filter
        if (activeFilter === 'important' && !contact.important) {
            return false;
        }
        if (activeFilter === 'unread' && contact.unread === 0) {
            return false;
        }
        // Apply search query
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            contact.name.toLowerCase().includes(query) ||
            contact.lastMessage.toLowerCase().includes(query) ||
            contact.headline.toLowerCase().includes(query)
        );
    });

    return (
        <section className='flex md:grid md:grid-cols-[33%_1fr] w-full h-full bg-[#f0f2f5] dark:bg-gray-900 overflow-hidden chat-container'>
            {/* Left sidebar */}
            <div className={`flex flex-col bg-white dark:bg-gray-900 border-r border-[#ddd] dark:border-gray-800 min-h-0 ${selectedContact ? 'hidden md:flex w-full' : 'flex w-full'}`}>
                {/* Header with sync button */}
                <div className='flex items-center justify-between p-2'>
                    <div className='w-[45px] h-[45px] rounded-full flex-shrink-0'>
                        <img src='/trobyx.svg' alt='logo' width='45' height='45' />
                    </div>
                    <div className='flex items-center gap-4 relative' ref={menuRef}>
                        {/* Sync button */}
                        <button
                            onClick={handleSyncLinkedin}
                            disabled={isLoading}
                            className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50 transition-colors'
                            title='Sync with LinkedIn'
                        >
                            <RefreshCw
                                className={`w-5 h-5 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`}
                            />
                        </button>
                        {/* Menu Icon */}
                        <Menu
                            className='w-6 h-6 text-gray-600 dark:text-gray-400 cursor-pointer'
                            onClick={() => setMenuOpen(!menuOpen)}
                        />
                        {/* DROPDOWN MENU */}
                        {menuOpen && (
                            <div className='absolute top-10 right-0 bg-white dark:bg-gray-800 shadow-lg dark:shadow-black/20 rounded-md w-48 py-2 z-50 border dark:border-gray-700'>
                                <div
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-2 cursor-pointer ${activeFilter === 'all' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'dark:text-gray-200'}`}
                                    onClick={() => applyFilter('all')}
                                >
                                    <span>All Messages</span>
                                </div>
                                <div
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-2 cursor-pointer ${activeFilter === 'important' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'dark:text-gray-200'}`}
                                    onClick={() => applyFilter('important')}
                                >
                                    <AlertCircle className='w-4 h-4' />
                                    <span>Important Messages</span>
                                </div>
                                <div
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-2 cursor-pointer ${activeFilter === 'unread' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'dark:text-gray-200'}`}
                                    onClick={() => applyFilter('unread')}
                                >
                                    <MailOpen className='w-4 h-4' />
                                    <span>Unread Messages</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Error Display */}
                {error && (
                    <div className='mx-3 my-2 p-3 bg-red-50 border border-red-200 rounded-lg'>
                        <div className='flex items-center justify-between'>
                            <span className='text-sm text-red-600'>{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className='text-red-500 hover:text-red-700'
                            >
                                <X className='w-4 h-4' />
                            </button>
                        </div>
                    </div>
                )}
                {/* Last synced time */}
                {lastSynced && (
                    <div className='px-3 py-1 text-xs text-gray-500'>
                        Last synced: {formatTime(lastSynced.getTime())}
                    </div>
                )}
                {/* Filter indicator */}
                {activeFilter !== 'all' && (
                    <div className='flex items-center justify-between px-4 py-2 mx-2 mb-2 bg-blue-50 rounded-lg'>
                        <div className='flex items-center gap-2'>
                            <Filter className='w-4 h-4 text-blue-600' />
                            <span className='text-sm text-blue-600 font-medium'>
                                {activeFilter === 'important'
                                    ? 'Showing Important Messages'
                                    : 'Showing Unread Messages'}
                            </span>
                        </div>
                        <button
                            onClick={clearFilter}
                            className='text-xs text-blue-600 hover:text-blue-800 font-medium'
                        >
                            Clear
                        </button>
                    </div>
                )}
                <div className='flex items-center rounded-full px-3 py-2 gap-2 mx-3 my-2 bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-700 shadow-sm'>
                    <Search className='w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0' />
                    <input
                        type='text'
                        placeholder='Search contacts...'
                        className='flex-1 border-none outline-none bg-transparent text-sm px-1 dark:text-white'
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <X
                            className='w-5 h-5 text-gray-500 dark:text-gray-400 cursor-pointer flex-shrink-0'
                            onClick={handleClearSearch}
                        />
                    )}
                </div>
                <div className='flex-1 overflow-y-auto min-h-0'>
                    {isLoading ? (
                        <div className='flex flex-col items-center justify-center h-[300px] text-center p-5'>
                            <Loader2 className='w-8 h-8 text-blue-500 animate-spin mb-4' />
                            <p className='text-gray-600 dark:text-gray-400'>Loading LinkedIn conversations...</p>
                        </div>
                    ) : filteredContacts.length > 0 ? (
                        filteredContacts.map(contact => (
                            <div
                                key={contact.id}
                                className={`flex items-center p-3 cursor-pointer transition-colors 
                    border-b border-[1px] border-[#e9e9e9] dark:border-gray-800
                    hover:bg-[#f5f5f5] dark:hover:bg-gray-800/50
                    ${selectedContact?.id === contact.id ? 'bg-[#f0f9ff] dark:bg-blue-900/20 border-l-4 border-l-[#0a66c2]' : ''}`}
                                onClick={() => handleContactClick(contact)}
                            >
                                <div className='relative'>
                                    <div className='w-[45px] h-[45px] rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700'>
                                        <img
                                            src={avatr}
                                            alt={contact.name}
                                            className='w-full h-full object-cover'
                                            onError={e => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = avatr;
                                                target.onerror = null;
                                            }}
                                            loading='lazy'
                                        />
                                    </div>
                                    {contact.important && (
                                        <div className='absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center'>
                                            <AlertCircle className='w-3 h-3' />
                                        </div>
                                    )}
                                    {contact.unread > 0 && (
                                        <div className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs'>
                                            {contact.unread}
                                        </div>
                                    )}
                                </div>
                                <div className='ml-3 flex-1 min-w-0'>
                                    <div className='flex items-center gap-2'>
                                        <div className='font-medium text-sm truncate dark:text-white'>
                                            {contact.name}
                                        </div>
                                        <Linkedin className='w-3 h-3 text-blue-600 flex-shrink-0' />
                                    </div>
                                    <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                                        {contact.lastMessage.length > 40
                                            ? `${contact.lastMessage.substring(0, 40)}...`
                                            : contact.lastMessage}
                                    </div>
                                    {contact.headline && (
                                        <div className='text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5'>
                                            {contact.headline.length > 30
                                                ? `${contact.headline.substring(0, 30)}...`
                                                : contact.headline}
                                        </div>
                                    )}
                                </div>
                                <div className='ml-2 flex flex-col items-end'>
                                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                                        {formatTime(contact.time)}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className='flex flex-col items-center justify-center h-[300px] text-center p-5 text-gray-600'>
                            {linkedinConversations.length === 0 ? (
                                <>
                                    <Linkedin size={48} className='text-gray-300 mb-4' />
                                    <p className='mb-2'>No LinkedIn conversations found</p>
                                    <p className='text-sm text-gray-500 mb-4'>
                                        Connect with people on LinkedIn to see messages here
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Search size={48} className='text-gray-300 mb-4' />
                                    <p className='mb-2'>No conversations match your search</p>
                                </>
                            )}
                            <div className='flex gap-2'>
                                {searchQuery && (
                                    <button
                                        className='bg-gray-200 text-gray-700 border-none px-4 py-2 rounded-full cursor-pointer text-sm font-medium transition-colors mt-3 hover:bg-gray-300'
                                        onClick={handleClearSearch}
                                    >
                                        Clear search
                                    </button>
                                )}
                                <button
                                    className='bg-[#0a66c2] text-white border-none px-5 py-2 rounded-full cursor-pointer text-sm font-medium transition-colors mt-3 hover:bg-[#004182] flex items-center gap-2'
                                    onClick={handleSyncLinkedin}
                                >
                                    <RefreshCw className='w-4 h-4' />
                                    Refresh LinkedIn
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Right chat area */}
            <div className={`flex flex-col bg-[#efe7dd] dark:bg-[#0b141a] bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_0e0e0e5c2f9c3b5c5c5c5c5c5c5c5c.png')] dark:bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e729a2852cf366635f606880.png')] bg-repeat min-h-0 ${selectedContact ? 'flex w-full' : 'hidden md:flex'}`}>
                {/* Chat header */}
                <div className='h-[70px] min-h-[60px] bg-[#f0f2f5] dark:bg-gray-800 flex justify-between items-center px-4 border-b border-[#ddd] dark:border-gray-700 z-10 relative'>
                    <div className='flex items-center gap-3'>
                        {selectedContact && (
                            <button
                                onClick={() => setSelectedContact(null)}
                                className='md:hidden p-1 -ml-1 mr-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'
                            >
                                <ArrowLeft className='w-6 h-6 text-gray-600 dark:text-gray-300' />
                            </button>
                        )}
                        {selectedContact ? (
                            <>
                                <div className='w-10 h-10 rounded-full bg-gray-300 overflow-hidden'>
                                    <img
                                        src={avatr}
                                        alt={selectedContact.name}
                                        className='w-full h-full object-cover'
                                        onError={e => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/default-avatar.png';
                                            target.onerror = null;
                                        }}
                                        loading='lazy'
                                    />
                                </div>
                                <div className='flex flex-col min-w-0'>
                                    <span className='font-medium dark:text-white truncate'>{selectedContact.name}</span>
                                    {selectedContact.headline && (
                                        <span className='text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]'>
                                            {selectedContact.headline}
                                        </span>
                                    )}
                                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                                        {isLoadingMessages
                                            ? 'Loading messages...'
                                            : `${messages.length} messages`}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className='flex items-center gap-3'>
                                <Linkedin className='w-6 h-6 text-[#0a66c2]' />
                                <span className='text-gray-500'>
                                    Select a contact to start chatting
                                </span>
                            </div>
                        )}
                    </div>
                    <div className='flex items-center gap-4'>
                        {selectedContact && (
                            <a
                                href={selectedContact.other_participant_id
                                    ? `https://www.linkedin.com/in/${selectedContact.other_participant_id}/`
                                    : selectedContact.profile_urn
                                        ? `https://www.linkedin.com/in/${selectedContact.profile_urn.split(':').pop()}/`
                                        : '#'
                                }
                                target='_blank'
                                rel='noopener noreferrer'
                                className='bg-[#0a66c2] text-white font-semibold p-1.5 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-1.5 transition-colors hover:bg-[#004182] focus:outline-none transition-all flex-shrink-0'
                                title="View LinkedIn Profile"
                            >
                                <Linkedin className='w-4 h-4' />
                                <span className='hidden sm:inline text-xs'>View Profile</span>
                            </a>
                        )}
                        {/* Search animation container */}
                        <div
                            className={`header-search-container 
                            ${showHeaderSearch ? 'header-search-show' : 'header-search-hide'} dark:bg-gray-700`}
                        >
                            <input
                                type='text'
                                className='header-search-input outline-none focus:outline-none dark:text-white focus:ring-0'
                                value={headerSearchText}
                                onChange={e => setHeaderSearchText(e.target.value)}
                                placeholder='Search...'
                            />
                            {showHeaderSearch && (
                                <X
                                    className='w-5 h-5 text-gray-500 dark:text-gray-400 cursor-pointer flex-shrink-0'
                                    onClick={() => {
                                        setShowHeaderSearch(false);
                                        setHeaderSearchText('');
                                    }}
                                />
                            )}
                        </div>
                        {/* The search icon */}
                        {!showHeaderSearch && (
                            <Search
                                className='w-6 h-6 text-gray-600 dark:text-gray-400 cursor-pointer flex-shrink-0'
                                onClick={() => setShowHeaderSearch(true)}
                            />
                        )}
                    </div>
                </div>
                {/* Main chat area */}
                <div className='flex-1 flex flex-col min-h-0 relative'>
                    {/* Loading indicator for messages */}
                    {isLoadingMessages && messages.length === 0 && (
                        <div className='absolute top-0 left-0 right-0 flex justify-center py-4 z-20'>
                            <div className='bg-[#0a66c2] dark:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg'>
                                <Loader2 className='w-4 h-4 animate-spin' />
                                Loading messages from LinkedIn...
                            </div>
                        </div>
                    )}
                    {/* Messages container */}
                    <div
                        className='flex-1 overflow-y-auto px-4 pt-5 min-h-0 flex flex-col'
                        ref={messagesContainerRef}
                    >
                        {!selectedContact ? (
                            <div className='flex flex-col items-center justify-center h-full text-gray-600 text-center p-5'>
                                <div className='mb-4 text-gray-300'>
                                    <MessageCircle size={64} />
                                </div>
                                <h3 className='text-xl font-semibold mb-2'>
                                    LinkedIn Messenger
                                </h3>
                                <p className='text-gray-500 mb-4'>
                                    Select a conversation from the left to view messages
                                </p>
                                <div className='flex items-center gap-2 text-sm text-gray-400'>
                                    <Linkedin className='w-4 h-4' />
                                    <span>Secure LinkedIn Integration</span>
                                </div>
                            </div>
                        ) : messages.length > 0 ? (
                            <div className='flex flex-col gap-4 flex-1 pb-6'>
                                {messages.map((message, index) => {
                                    // Date separator logic - check for valid timestamp
                                    const timestamp = message.timestamp || 0;
                                    const dateObj = new Date(timestamp);
                                    const isValidDate = !isNaN(dateObj.getTime());

                                    const currentDate = isValidDate ? dateObj.toDateString() : 'Unknown';
                                    const previousMsg = index > 0 ? messages[index - 1] : null;
                                    const previousTimestamp = previousMsg?.timestamp || 0;
                                    const previousDate = index > 0 ? new Date(previousTimestamp).toDateString() : null;
                                    const showDateSeparator = isValidDate && currentDate !== previousDate;

                                    return (
                                        <React.Fragment key={message.id}>
                                            {showDateSeparator && (
                                                <div className='flex justify-center my-4 opacity-70'>
                                                    <span className='bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold shadow-sm'>
                                                        {dateObj.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            )}
                                            <div
                                                ref={el => { messageRefs.current[message.id] = el; }}
                                                className={`flex items-end gap-2 mb-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {/* Contact's message on LEFT side */}
                                                {message.sender === 'contact' && (
                                                    <>
                                                        <div className='w-8 h-8 rounded-full overflow-hidden flex-shrink-0'>
                                                            <img
                                                                src={avatr}
                                                                alt={selectedContact.name}
                                                                className='w-full h-full object-cover'
                                                                onError={e => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.src = '/default-avatar.png';
                                                                    target.onerror = null;
                                                                }}
                                                                loading='lazy'
                                                            />
                                                        </div>
                                                        <div className='max-w-[75%]'>
                                                            <div className='bg-white dark:bg-[#202c33] rounded-2xl rounded-bl-none px-4 py-2.5 shadow-sm animate-fadeIn'>
                                                                <div className='text-[14px] leading-relaxed mb-1 whitespace-pre-wrap text-[#333] dark:text-[#e9edef]'>
                                                                    {message.text}
                                                                </div>
                                                                <div className='text-[10px] text-gray-500 dark:text-[#8696a0] text-right leading-none mt-1'>
                                                                    {message.time || 'recently'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                {/* User's message on RIGHT side */}
                                                {message.sender === 'user' && (
                                                    <>
                                                        <div className='max-w-[75%]'>
                                                            <div className='bg-[#0a66c2] dark:bg-[#005c4b] text-white rounded-2xl rounded-br-none px-4 py-2.5 animate-fadeIn relative shadow-sm'>
                                                                {message.isSending && (
                                                                    <div className='absolute -top-2 -right-2'>
                                                                        <Loader2 className='w-3 h-3 text-blue-100 animate-spin' />
                                                                    </div>
                                                                )}
                                                                <div className='text-[14px] leading-relaxed mb-1 whitespace-pre-wrap dark:text-[#e9edef]'>
                                                                    {message.text}
                                                                </div>
                                                                <div className='text-[10px] text-blue-100/90 dark:text-[#8696a0] text-right flex items-center gap-1 justify-end leading-none mt-1'>
                                                                    {message.time || 'just now'}
                                                                    {message.isSending && (
                                                                        <Loader2 className='w-2.5 h-2.5 animate-spin' />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className='w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border border-[#0a66c2]/20 dark:border-blue-500/20'>
                                                            <User className='w-5 h-5 text-[#0a66c2] dark:text-blue-400' />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        ) : (
                            <div className='flex flex-col items-center justify-center h-full p-6'>
                                <div className='text-center'>
                                    <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center'>
                                        <MessageCircle className='w-8 h-8 text-gray-400' />
                                    </div>
                                    <h3 className='text-lg font-medium text-gray-600 mb-2'>
                                        No messages yet
                                    </h3>
                                    <p className='text-gray-500 mb-6'>
                                        Start a conversation with {selectedContact.name}
                                    </p>
                                    {selectedContact.headline && (
                                        <div className='text-sm text-gray-400 mb-4'>
                                            {selectedContact.headline}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Message input */}
                    {selectedContact && (
                        <div className='sticky bottom-0 left-0 right-0 px-4 py-2 z-10 bg-transparent'>
                            <div className='flex items-center gap-3 bg-white dark:bg-[#2a3942] rounded-full px-4 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.1)]'>
                                <div className='flex-1'>
                                    <textarea
                                        placeholder={`Message ${selectedContact.name}...`}
                                        className='w-full border-none outline-none bg-transparent py-2 text-[15px] resize-none h-10 dark:text-white'
                                        value={inputMessage}
                                        onChange={e => setInputMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        disabled={isSending}
                                        rows={1}
                                        style={{ minHeight: '40px', maxHeight: '120px' }}
                                    />
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputMessage.trim() || isSending}
                                    className={`p-3 rounded-full transition-all ${inputMessage.trim() && !isSending
                                        ? 'text-white bg-[#0a66c2] hover:bg-[#004182]'
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                        }`}
                                >
                                    {isSending ? (
                                        <Loader2 className='w-5 h-5 animate-spin' />
                                    ) : (
                                        <Send className='w-5 h-5' />
                                    )}
                                </button>
                            </div>
                            <div className='text-[10px] text-gray-500 mt-1 text-center'>
                                Messages are sent via LinkedIn
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section >
    );
}

export default Messages;