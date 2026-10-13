-- 'WAITLIST_PROMOTED' é o tipo que promote_waitlist_next() grava ao promover
-- o próximo da fila, e nunca existiu no enum. Com alguém esperando, a função
-- falhava nesse INSERT e a promoção inteira era desfeita — tanto no
-- cancelamento de uma inscrição confirmada quanto no job de expiração.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'WAITLIST_PROMOTED';
