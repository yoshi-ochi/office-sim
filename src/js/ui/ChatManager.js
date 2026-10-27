// src/js/ui/ChatManager.js

export class ChatManager {
  constructor(sheetService, getCurrentUser, getCurrentFloor) {
    this.sheetService = sheetService;
    this.getCurrentUser = getCurrentUser;
    this.getCurrentFloor = getCurrentFloor;

    this.isOpen = false;
    this.channel = 'all';
    this.target = 'all';
    this.unreadCount = 0;
    this.lastSeenMessageId = null;
    this.pollInterval = null;

    this.initElements();
    this.setupEvents();
  }

  initElements() {
    this.drawer = document.getElementById('chat-drawer');
    this.badge = document.getElementById('chat-unread-badge');
    this.container = document.getElementById('chat-messages');
    this.input = document.getElementById('chat-input-text');
  }

  setupEvents() {
    document.getElementById('btn-chat-toggle')?.addEventListener('click', () => this.open());
    document.getElementById('btn-chat-close')?.addEventListener('click', () => this.close());
    document.getElementById('chat-send-btn')?.addEventListener('click', () => this.sendMessage());
    this.input?.addEventListener('keypress', e => { if (e.key === 'Enter') this.sendMessage(); });

    document.querySelectorAll('.chat-tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.chat-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.channel = e.target.getAttribute('data-channel');
        this.target = this.channel === 'floor' ? String(this.getCurrentFloor()) : 'all';
        this.loadMessages();
      });
    });

    // 常時5秒間隔で新着確認
    this.pollInterval = setInterval(() => this.checkNewMessages(), 5000);
  }

  open() {
    this.isOpen = true;
    this.drawer.classList.add('open');
    this.unreadCount = 0;
    this.updateBadge();
    this.loadMessages();
  }

  close() {
    this.isOpen = false;
    this.drawer.classList.remove('open');
  }

  updateBadge() {
    if (!this.badge) return;
    if (this.unreadCount > 0) {
      this.badge.style.display = 'flex';
      this.badge.innerText = this.unreadCount > 99 ? '99+' : this.unreadCount;
    } else {
      this.badge.style.display = 'none';
    }
  }

  async checkNewMessages() {
    const messages = await this.sheetService.fetchChatMessages(this.channel, this.target);
    if (!messages || messages.length === 0) return;

    const latest = messages[messages.length - 1];
    if (this.lastSeenMessageId && latest.id !== this.lastSeenMessageId && !this.isOpen) {
      this.unreadCount++;
      this.updateBadge();
    }
    this.lastSeenMessageId = latest.id;
    if (this.isOpen) {
      this.renderMessages(messages);
    }
  }

  async loadMessages() {
    const messages = await this.sheetService.fetchChatMessages(this.channel, this.target);
    if (messages.length > 0) {
      this.lastSeenMessageId = messages[messages.length - 1].id;
    }
    this.renderMessages(messages);
  }

  renderMessages(messages) {
    if (!this.container) return;
    const currentUser = this.getCurrentUser();
    this.container.innerHTML = '';
    messages.forEach(m => {
      const isSelf = currentUser && m.senderName === currentUser.name;
      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-msg ${isSelf ? 'self' : 'other'}`;
      msgDiv.innerHTML = `<div class="chat-msg-meta">${m.senderName} • ${m.timestamp}</div><div>${m.message}</div>`;
      this.container.appendChild(msgDiv);
    });
    this.container.scrollTop = this.container.scrollHeight;
  }

  async sendMessage() {
    const text = this.input.value.trim();
    if (!text) return;

    const user = this.getCurrentUser();
    const sender = user ? user.name : '社員';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const msgObj = {
      id: `msg_${Date.now()}`,
      timestamp: timeStr,
      channelType: this.channel,
      channelTarget: this.target,
      senderName: sender,
      message: text
    };

    this.input.value = '';
    await this.sheetService.sendChatMessage(msgObj);
    this.loadMessages();
  }
}