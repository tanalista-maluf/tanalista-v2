"""Cria os dados que e2e/main-flow.yaml espera, no Supabase LOCAL.

Usuários (senha senha-teste-123): ana (organizadora), bruno (quem o teste usa)
e carla. Eventos: um gratuito, um pago (com o cupom TESTE50), um privado e um lotado.
Para e2e/extras-flow.yaml: um evento com dois times. Para e2e/groups-flow.yaml:
um grupo privado do Bruno com um pedido de entrada da Carla.
"""
import datetime
import json
import os
import urllib.request

API = os.environ["API_URL"]
KEY = os.environ["SERVICE_ROLE_KEY"]
HEADERS = {
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def call(path, body):
    request = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers=HEADERS)
    return json.loads(urllib.request.urlopen(request, timeout=20).read())


def user(name, email):
    created = call(
        "/auth/v1/admin/users",
        {"email": email, "password": "senha-teste-123", "email_confirm": True, "user_metadata": {"full_name": name}},
    )
    # Perfil já completo: sem isto o app abriria o onboarding para estes usuários
    request = urllib.request.Request(
        API + "/rest/v1/profiles?id=eq." + created["id"],
        data=json.dumps({"onboarding_completed": True, "city": "São Paulo", "phone": "11999990000"}).encode(),
        headers=HEADERS,
        method="PATCH",
    )
    urllib.request.urlopen(request, timeout=20).read()
    return created["id"]


def event(group_id, organizer_id, title, slug, days, price, capacity, visibility="PUBLIC", cancel_before_hours=None):
    start = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days)
    return {
        "group_id": group_id,
        "organizer_id": organizer_id,
        "title": title,
        "slug": slug,
        "description": "Traga colete e água. Chegar 15 minutos antes.",
        "address": "Quadra do Parque, Rua das Flores 100",
        "city": "São Paulo",
        "price": price,
        "capacity": capacity,
        "min_participants": 1,
        "starts_at": start.isoformat(),
        "registration_deadline": (start - datetime.timedelta(hours=2)).isoformat(),
        "min_check_at": (start - datetime.timedelta(hours=12)).isoformat(),
        "status": "OPEN",
        "visibility": visibility,
        # None = o participante não pode cancelar; 0 = pode a qualquer momento
        "cancel_before_hours": cancel_before_hours,
    }


ana = user("Ana Organizadora", "ana@teste.local")
bruno = user("Bruno Participante", "bruno@teste.local")
carla = user("Carla", "carla@teste.local")

group = call("/rest/v1/groups", {"owner_id": ana, "name": "Pelada de Quinta", "slug": "pelada-de-quinta", "visibility": "PUBLIC"})[0]
# O dono entra como membro, como faz o servidor ao criar um grupo
call("/rest/v1/group_members", {"group_id": group["id"], "user_id": ana, "role": "OWNER"})

# Para e2e/groups-flow.yaml: grupo privado do Bruno, com um pedido de entrada da Carla
private = call("/rest/v1/groups", {"owner_id": bruno, "name": "Clube fechado", "slug": "clube-fechado", "visibility": "PRIVATE", "city": "São Paulo"})[0]
call("/rest/v1/group_members", {"group_id": private["id"], "user_id": bruno, "role": "OWNER"})
call("/rest/v1/group_join_requests", {"group_id": private["id"], "user_id": carla, "status": "PENDING"})

events = call(
    "/rest/v1/events",
    [
        event(group["id"], ana, "Futebol de quinta", "futebol-de-quinta", 2, 0, 14, cancel_before_hours=0),
        event(group["id"], ana, "Torneio pago de sábado", "torneio-pago", 4, 3000, 20, cancel_before_hours=0),
        event(group["id"], ana, "Treino fechado", "treino-fechado", 6, 0, 10, "PRIVATE"),
        event(group["id"], ana, "Racha lotado", "racha-lotado", 8, 0, 2),
        event(group["id"], ana, "Vôlei com times", "volei-com-times", 10, 0, 4, cancel_before_hours=0),
    ],
)

# Para e2e/organizer-flow.yaml: pedido de entrada da Carla no evento privado da Ana
closed = next(e for e in events if e["slug"] == "treino-fechado")
call("/rest/v1/event_join_requests", {"event_id": closed["id"], "user_id": carla, "status": "PENDING"})

# O evento lotado precisa de inscrições de verdade: o servidor conta as linhas
full = next(e for e in events if e["slug"] == "racha-lotado")
call(
    "/rest/v1/participations",
    [
        {"event_id": full["id"], "user_id": ana, "status": "CONFIRMED"},
        {"event_id": full["id"], "user_id": carla, "status": "CONFIRMED"},
    ],
)

# Cupom de 50% para o evento pago (com percent_off, amount_cents não é usado)
paid = next(e for e in events if e["slug"] == "torneio-pago")
call("/rest/v1/coupons", {"code": "TESTE50", "percent_off": 50, "amount_cents": 1, "event_id": paid["id"], "active": True})

# Dois times no evento de vôlei
volei = next(e for e in events if e["slug"] == "volei-com-times")
call(
    "/rest/v1/event_teams",
    [
        {"event_id": volei["id"], "name": "Time Azul", "capacity": 2, "position": 0},
        {"event_id": volei["id"], "name": "Time Branco", "capacity": 2, "position": 1},
    ],
)

# Para e2e/event-flow.yaml: categoria, regras do organizador e capa no futebol,
# uma enquete no mural dele, e um evento já concluído de que o Bruno participou
futebol = next(e for e in events if e["slug"] == "futebol-de-quinta")
request = urllib.request.Request(
    API + "/rest/v1/events?id=eq." + futebol["id"],
    data=json.dumps(
        {
            "category": "Futebol",
            "custom_rules": "Chuteira society. Sem carrinho.",
            "cover_url": "http://127.0.0.1:3000/icon-512.png",
        }
    ).encode(),
    headers=HEADERS,
    method="PATCH",
)
urllib.request.urlopen(request, timeout=20).read()

poll = call("/rest/v1/event_polls", {"event_id": futebol["id"], "user_id": ana, "question": "Quem leva a bola?"})[0]
call(
    "/rest/v1/event_poll_options",
    [
        {"poll_id": poll["id"], "text": "Eu levo", "position": 0},
        {"poll_id": poll["id"], "text": "Alguém leva", "position": 1},
    ],
)

done = event(group["id"], ana, "Pelada concluída", "pelada-concluida", -3, 0, 10)
done["status"] = "COMPLETED"
done = call("/rest/v1/events", done)[0]
call("/rest/v1/participations", {"event_id": done["id"], "user_id": bruno, "status": "CONFIRMED"})

# Para e2e/wallet-flow.yaml: duas notificações não lidas do Bruno (uma leva ao
# evento) e um cupom de crédito da plataforma
call(
    "/rest/v1/notifications",
    [
        {
            "user_id": bruno,
            "type": "EVENT_CONFIRMED",
            "title": "Evento confirmado!",
            "body": "Futebol de quinta atingiu o mínimo de participantes.",
            "data": {"event_id": futebol["id"]},
            "read": False,
        },
        {
            "user_id": bruno,
            "type": "EVENT_REMINDER",
            "title": "Bem-vindo ao TáNaLista",
            "body": "Explore os eventos perto de você.",
            "data": {},
            "read": False,
        },
    ],
)
call("/rest/v1/coupons", {"code": "BEMVINDO", "amount_cents": 2000, "active": True})

print("Dados de teste criados:", ", ".join(e["title"] for e in events))
