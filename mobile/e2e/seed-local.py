"""Cria os dados que e2e/main-flow.yaml espera, no Supabase LOCAL.

Usuários (senha senha-teste-123): ana (organizadora), bruno (quem o teste usa)
e carla. Eventos: um gratuito, um pago, um privado e um lotado.
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
user("Bruno Participante", "bruno@teste.local")
carla = user("Carla", "carla@teste.local")

group = call("/rest/v1/groups", {"owner_id": ana, "name": "Pelada de Quinta", "slug": "pelada-de-quinta", "visibility": "PUBLIC"})[0]
events = call(
    "/rest/v1/events",
    [
        event(group["id"], ana, "Futebol de quinta", "futebol-de-quinta", 2, 0, 14, cancel_before_hours=0),
        event(group["id"], ana, "Torneio pago de sábado", "torneio-pago", 4, 3000, 20, cancel_before_hours=0),
        event(group["id"], ana, "Treino fechado", "treino-fechado", 6, 0, 10, "PRIVATE"),
        event(group["id"], ana, "Racha lotado", "racha-lotado", 8, 0, 2),
    ],
)

# O evento lotado precisa de inscrições de verdade: o servidor conta as linhas
full = next(e for e in events if e["slug"] == "racha-lotado")
call(
    "/rest/v1/participations",
    [
        {"event_id": full["id"], "user_id": ana, "status": "CONFIRMED"},
        {"event_id": full["id"], "user_id": carla, "status": "CONFIRMED"},
    ],
)

print("Dados de teste criados:", ", ".join(e["title"] for e in events))
