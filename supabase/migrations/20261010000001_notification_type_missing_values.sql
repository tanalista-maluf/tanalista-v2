-- O enum notification_type nunca acompanhou os tipos realmente usados pelo
-- código: toda notificação com um desses valores vinha falhando silenciosamente
-- ao inserir (createNotificationAdmin não checa o erro do insert), então
-- avisos de novo evento, evento atualizado, solicitações de entrada em
-- evento/grupo e transferência de grupo nunca apareciam no sininho do
-- destinatário. Adiciona os valores que faltam, mais o novo EVENT_MESSAGE
-- (aviso livre do organizador para os participantes confirmados).
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NEW_EVENT';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EVENT_UPDATED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EVENT_JOIN_REQUEST';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EVENT_JOIN_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EVENT_JOIN_REJECTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_JOIN_REQUEST';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_JOIN_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_JOIN_REJECTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GROUP_OWNERSHIP_TRANSFERRED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EVENT_MESSAGE';
