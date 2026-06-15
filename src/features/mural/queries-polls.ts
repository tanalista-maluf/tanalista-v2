import { createAdminClient } from '@/lib/supabase/admin'

export interface PollOption {
  id: string
  text: string
  position: number
  vote_count: number
}

export interface Poll {
  id: string
  question: string
  created_at: string
  user_id: string
  closes_at: string | null
  options: PollOption[]
  total_votes: number
  user_vote_option_id: string | null
}

export async function getEventPolls(eventId: string, currentUserId?: string): Promise<Poll[]> {
  const admin = createAdminClient()

  const { data: polls } = await admin
    .from('event_polls')
    .select(`
      id, question, created_at, user_id, closes_at,
      event_poll_options(id, text, position),
      event_poll_votes(option_id, user_id)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (!polls) return []

  return polls.map(poll => {
    const options = (poll.event_poll_options as { id: string; text: string; position: number }[])
      .sort((a, b) => a.position - b.position)

    const votes = poll.event_poll_votes as { option_id: string; user_id: string }[]
    const total = votes.length
    const userVote = currentUserId
      ? votes.find(v => v.user_id === currentUserId)?.option_id ?? null
      : null

    return {
      id: poll.id,
      question: poll.question,
      created_at: poll.created_at,
      user_id: poll.user_id,
      closes_at: poll.closes_at,
      total_votes: total,
      user_vote_option_id: userVote,
      options: options.map(opt => ({
        ...opt,
        vote_count: votes.filter(v => v.option_id === opt.id).length,
      })),
    }
  })
}
