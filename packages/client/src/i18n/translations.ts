// ─── Translation strings ──────────────────────────────────────────────────────

export type Locale = 'en' | 'tr';

export const translations = {
  en: {
    // Nav
    nav_github: 'GitHub',
    // HomePage
    home_badge: 'Transfers since launch',
    home_badge_note: '(it only updates every update)',
    home_h1: 'Share files instantly.',
    home_subtitle: 'Direct browser-to-browser transfer using WebRTC. No servers, no accounts, no limits.',
    home_create_room: 'Create new room',
    home_advanced_options: 'Advanced Options',
    home_hide_options: 'Hide Options',
    home_optional_password: 'Optional password',
    home_broadcast_mode: 'Broadcast Mode (Only you can send files)',
    home_or_join: 'Or join',
    home_room_code_placeholder: 'Room code',
    home_join_room: 'Join room',
    home_made_by: 'made by',
    // RoomPage
    room_share_hint: 'Share the room code above — your peer can join from any browser.',
    room_error_title: 'Connection error',
    room_password_title: 'Room Password',
    room_password_subtitle: 'This room is protected by a password.',
    room_password_placeholder: 'Enter password',
    room_join_btn: 'Join Room',
    // RoomHeader
    header_leave: 'Leave',
    header_copy_code: 'Copy code',
    header_copied: 'Copied!',
    header_status_connected: 'Connected',
    header_status_connecting: 'Connecting',
    header_status_reconnecting: 'Reconnecting',
    header_status_error: 'Error',
    header_status_idle: 'Idle',
    // DropZone
    dropzone_drag: 'Drag & drop files here',
    dropzone_any_type: 'Images, videos, archives — any file type',
    dropzone_drop_to_send: 'Drop to send',
    dropzone_browse_files: 'Browse files',
    dropzone_folder: 'Folder',
    dropzone_waiting: 'Waiting for someone to join...',
    dropzone_broadcast_only: 'Only the creator can send files in this broadcast room.',
    // FileStagingModal
    staging_title: 'Ready to send',
    staging_subtitle: 'Review your files before sending',
    staging_add_more: 'Add more',
    staging_send: 'Send',
    staging_file: 'file',
    staging_files: 'files',
    staging_cancel: 'Cancel',
    // TransferList
    transfer_all: 'All',
    transfer_sent: 'Sent',
    transfer_received: 'Received',
    transfer_clear: 'Clear',
    transfer_none: 'No transfers yet',
    transfer_none_sent: 'Nothing sent yet',
    transfer_none_received: 'Nothing received yet',
    // PeerList
    peer_connected: 'Connected',
    peer_connecting: 'Connecting...',
    peer_failed: 'Failed',
    peer_you: 'You',
    // AdBanner
    ad_title: 'Advertise Here',
    ad_subtitle: 'DM @martinari.ad on Instagram',
    // Language toggle
    lang_toggle: 'Türkçe',
  },
  tr: {
    // Nav
    nav_github: 'GitHub',
    // HomePage
    home_badge: 'Lansmandan bu yana transfer',
    home_badge_note: '(her güncellemede güncellenir)',
    home_h1: 'Dosyaları anında paylaş.',
    home_subtitle: 'WebRTC kullanarak doğrudan tarayıcıdan tarayıcıya transfer. Sunucu yok, hesap yok, sınır yok.',
    home_create_room: 'Yeni oda oluştur',
    home_advanced_options: 'Gelişmiş Seçenekler',
    home_hide_options: 'Seçenekleri Gizle',
    home_optional_password: 'İsteğe bağlı şifre',
    home_broadcast_mode: 'Yayın Modu (Sadece sen dosya gönderebilirsin)',
    home_or_join: 'Veya katıl',
    home_room_code_placeholder: 'Oda kodu',
    home_join_room: 'Odaya katıl',
    home_made_by: 'yapan',
    // RoomPage
    room_share_hint: 'Oda kodunu paylaş — karşı taraf herhangi bir tarayıcıdan katılabilir.',
    room_error_title: 'Bağlantı hatası',
    room_password_title: 'Oda Şifresi',
    room_password_subtitle: 'Bu oda şifre korumalıdır.',
    room_password_placeholder: 'Şifreyi girin',
    room_join_btn: 'Odaya Gir',
    // RoomHeader
    header_leave: 'Ayrıl',
    header_copy_code: 'Kodu kopyala',
    header_copied: 'Kopyalandı!',
    header_status_connected: 'Bağlandı',
    header_status_connecting: 'Bağlanıyor',
    header_status_reconnecting: 'Yeniden bağlanıyor',
    header_status_error: 'Hata',
    header_status_idle: 'Boşta',
    // DropZone
    dropzone_drag: 'Dosyaları buraya sürükle & bırak',
    dropzone_any_type: 'Resim, video, arşiv — her dosya türü',
    dropzone_drop_to_send: 'Göndermek için bırak',
    dropzone_browse_files: 'Dosya seç',
    dropzone_folder: 'Klasör',
    dropzone_waiting: 'Birinin katılması bekleniyor...',
    dropzone_broadcast_only: 'Bu yayın odasında sadece oluşturucu dosya gönderebilir.',
    // FileStagingModal
    staging_title: 'Göndermeye hazır',
    staging_subtitle: 'Dosyaları göndermeden önce kontrol et',
    staging_add_more: 'Daha fazla ekle',
    staging_send: 'Gönder',
    staging_file: 'dosya',
    staging_files: 'dosya',
    staging_cancel: 'İptal',
    // TransferList
    transfer_all: 'Tümü',
    transfer_sent: 'Gönderilen',
    transfer_received: 'Alınan',
    transfer_clear: 'Temizle',
    transfer_none: 'Henüz transfer yok',
    transfer_none_sent: 'Henüz hiçbir şey gönderilmedi',
    transfer_none_received: 'Henüz hiçbir şey alınmadı',
    // PeerList
    peer_connected: 'Bağlandı',
    peer_connecting: 'Bağlanıyor...',
    peer_failed: 'Başarısız',
    peer_you: 'Sen',
    // AdBanner
    ad_title: 'Buraya Reklam Ver',
    ad_subtitle: 'Instagram\'dan @martinari.ad\'a DM at',
    // Language toggle
    lang_toggle: 'English',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
