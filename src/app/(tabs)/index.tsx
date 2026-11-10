import { useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useMutation } from '@tanstack/react-query'
import {
  Sparkles, ArrowRight, Receipt, ArrowDownUp, Wallet, Users, ChevronRight, AlertCircle, RotateCcw,
} from 'lucide-react-native'

import type { Draft, DraftItem, Expense, ExpenseCreateBody, Settlement } from '../../types'
import {
  useActiveGroup, useGroupData, useInvalidateGroup,
} from '../../hooks/useGroupData'
import { useSettings } from '../../state/settings'
import { useToast } from '../../state/toast'
import {
  parseExpense, createExpense,
} from '../../api'
import { normalizeDraft, draftProblem } from '../../lib/drafts'
import { formatMoney, toApiAmount, EPSILON } from '../../lib/money'
import { todayISO, isValidISODate, dateLabel } from '../../lib/dates'
import { playSound } from '../../lib/sounds'
import { haptic } from '../../lib/haptics'

import { Screen } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { Card } from '../../components/Card'
import { Chip } from '../../components/Chip'
import { GradientButton } from '../../components/GradientButton'
import { AiOrb } from '../../components/AiOrb'
import { DraftCard } from '../../components/DraftCard'
import { colors, radius, spacing, typography, gradients } from '../../design/tokens'
import { fieldLabel, inputStyle } from '../../design/styles'

const PLACEHOLDERS = [
  'Ahmed paid Rs. 7000 for groceries. Split equally.',
  'I paid Rs. 2500 for electricity. Only Ahmed and I share it.',
  'Adeel paid Rs. 5000. Ahmed owes 2000 and Mukkarram owes 3000.',
]

export default function AskAiScreen() {
  const router = useRouter()
  const { group, isError: groupsError, error, refetch: refetchGroups } = useActiveGroup()
  const groupId = group?.id ?? null
  const { users, balances, expenses, settlements } = useGroupData(groupId)
  const invalidateGroup = useInvalidateGroup(groupId)

  const members = users.data ?? []
  const currency = balances.data?.currency ?? group?.currency ?? 'PKR'
  const identityId = useSettings((s) => (groupId != null ? s.identities[groupId] : undefined))
  const setIdentity = useSettings((s) => s.setIdentity)
  const markMutation = useSettings((s) => s.markMutation)
  const showToast = useToast((s) => s.show)

  const [prompt, setPrompt] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [manualMode, setManualMode] = useState(false)
  const [manualDesc, setManualDesc] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualPayer, setManualPayer] = useState<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length), 4500)
    return () => clearInterval(timer)
  }, [])

  // ---- AI parse -------------------------------------------------------------
  const cancelParseRef = useRef(false)

  const aiMutation = useMutation({
    mutationFn: (text: string) =>
      parseExpense({ prompt: text, group_id: groupId as number, speaker_user_id: identityId ?? null }),
    onMutate: () => {
      cancelParseRef.current = false
    },
    onSuccess: (result) => {
      if (cancelParseRef.current) return // user cancelled; drop the late response
      const fallback = members.map((m) => m.id)
      const incoming = (result.drafts ?? []).map((raw) => normalizeDraft(raw, fallback))
      setDrafts(incoming)
      showToast({
        kind: 'success',
        title: incoming.length > 1 ? `AI found ${incoming.length} expenses` : 'AI draft ready',
        body: incoming.length ? 'Review and edit each draft before saving.' : 'Nothing usable was found — add amounts and who paid.',
      })
      if (!incoming.length) playSound('error')
    },
    onError: (error: Error) => {
      if (cancelParseRef.current) return
      showToast({ kind: 'error', title: 'AI could not parse this', body: error.message })
      playSound('error')
      haptic.error()
    },
  })
  const parsing = aiMutation.isPending

  // ---- Expense save (AI draft or manual) ------------------------------------
  const saveMutation = useMutation({
    mutationFn: (body: ExpenseCreateBody) => createExpense(body),
    onMutate: () => markMutation(), // suppress the "new expense" echo for our own phone
    onSuccess: () => {
      invalidateGroup()
      showToast({ kind: 'success', title: 'Expense saved', body: 'Balances updated on all phones.' })
      playSound('save')
      haptic.success()
    },
    onError: (error: Error) => {
      showToast({ kind: 'error', title: 'Not saved', body: error.message })
      playSound('error')
      haptic.error()
    },
  })

  const updateDraft = (index: number, patch: Partial<Draft>) =>
    setDrafts((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)))

  const toggleParticipant = (index: number, userId: number) =>
    setDrafts((current) => current.map((d, i) => {
      if (i !== index) return d
      const set = new Set(d.participant_ids)
      if (set.has(userId)) set.delete(userId)
      else set.add(userId)
      return { ...d, participant_ids: [...set].sort((a, b) => a - b) }
    }))

  const updateDraftItem = (index: number, itemIndex: number, patch: Partial<DraftItem>) =>
    setDrafts((current) => current.map((d, i) => {
      if (i !== index) return d
      return { ...d, items: d.items.map((item, j) => (j === itemIndex ? { ...item, ...patch } : item)) }
    }))

  const changeSplitType = (index: number, mode: 'equal' | 'items') =>
    setDrafts((current) => current.map((d, i) => {
      if (i !== index) return d
      if (mode === 'items' && d.items.length === 0) {
        return { ...d, split_type: mode, items: [{ item_name: '', owner_name: null, owner_user_id: null, owner_status: 'missing', amount: '' }] }
      }
      return { ...d, split_type: mode }
    }))

  const memberIds = members.map((m) => m.id)

  const confirmDraft = (index: number) => {
    const draft = drafts[index]
    const problem = draftProblem(draft, memberIds)
    if (problem) {
      showToast({ kind: 'error', title: 'Check the draft', body: problem })
      playSound('error')
      haptic.warning()
      return
    }
    const description = draft.description.trim() || 'AI expense'
    const base = {
      group_id: groupId as number,
      paid_by: Number(draft.paid_by_user_id),
      description,
      expense_date: isValidISODate(draft.date) ? draft.date : todayISO(),
      client_request_id: draft.client_request_id,
    }
    const body: ExpenseCreateBody = draft.split_type === 'equal'
      ? { ...base, total_amount: toApiAmount(draft.total_amount), split_equal_user_ids: draft.participant_ids }
      : {
          ...base,
          total_amount: toApiAmount(draft.total_amount),
          items: draft.items.map((item) => ({
            owner_id: Number(item.owner_user_id),
            item_name: item.item_name.trim() || description,
            amount: toApiAmount(item.amount),
          })),
        }
    setSavingIndex(index)
    saveMutation.mutate(body, {
      onSuccess: () => setDrafts((current) => current.filter((_, i) => i !== index)),
      onSettled: () => setSavingIndex(null),
    })
  }

  const effectiveManualPayer = manualPayer ?? identityId ?? null

  const submitManualExpense = () => {
    if (groupId == null || effectiveManualPayer == null) {
      showToast({ kind: 'error', title: 'Who paid?', body: 'Select the payer below.' })
      return
    }
    const amount = Number(manualAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({ kind: 'error', title: 'Enter a valid amount', body: 'The amount must be greater than zero.' })
      return
    }
    saveMutation.mutate({
      group_id: groupId,
      paid_by: effectiveManualPayer,
      description: manualDesc.trim() || 'Shared expense',
      expense_date: todayISO(),
      total_amount: toApiAmount(amount),
      split_equal_user_ids: memberIds,
      client_request_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    }, {
      onSuccess: () => {
        setManualDesc(''); setManualAmount(''); setManualMode(false)
      },
    })
  }

  // ---- Hero position summary --------------------------------------------------
  const myBalance = balances.data?.balances.find((b) => b.user_id === identityId) ?? null
  const owesMe = (balances.data?.suggested_transfers ?? []).filter((t) => t.to_user_id === identityId)
  const iOwe = (balances.data?.suggested_transfers ?? []).filter((t) => t.from_user_id === identityId)
  const myNet = myBalance ? Number(myBalance.net_balance) : 0
  const namesFor = (ids: number[]) => ids.map((id) => members.find((m) => m.id === id)?.name ?? '?').join(', ')

  // ---- Recent activity preview ------------------------------------------------
  const nameFor = (id: number) => members.find((m) => m.id === id)?.name ?? 'Unknown'
  const recent = useMemo(() => {
    const rows = [
      ...(expenses.data ?? []).map((e: Expense) => ({ key: `e${e.id}`, kind: 'expense' as const, date: e.expense_date, item: e })),
      ...(settlements.data ?? []).map((s: Settlement) => ({ key: `s${s.id}`, kind: 'settlement' as const, date: s.settled_at ?? '', item: s })),
    ]
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    return rows.slice(0, 2)
  }, [expenses.data, settlements.data])

  const heroSubline = !identityId
    ? 'Pick who you are in Settings → Identity'
    : Math.abs(myNet) <= EPSILON
      ? 'All square — nothing owed either way'
      : myNet > 0
        ? `${namesFor(owesMe.map((t) => t.from_user_id))} owe${owesMe.length === 1 ? 's' : ''} you`
        : `You owe ${namesFor(iOwe.map((t) => t.to_user_id))}`

  // ---- No flat yet / backend error states ------------------------------------
  if (!group && !groupsError) {
    return (
      <Screen>
        <ScreenHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: 16 }}>
          <LinearGradient colors={[...gradients.mintButton] as [string, string]} style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Users size={30} color="#06251F" strokeWidth={1.8} />
          </LinearGradient>
          <Text style={{ color: colors.text, fontFamily: typography.display, fontSize: 22, textAlign: 'center' }}>
            Welcome to Flat Expense Manager
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            Create your flat in Settings, add your flatmates, then come back here and describe your first expense.
          </Text>
          <GradientButton label="Open Settings" icon={<ChevronRight size={18} color="#06251F" strokeWidth={2.2} />} onPress={() => router.push('/(tabs)/settings')} />
        </View>
      </Screen>
    )
  }

  if (groupsError) {
    return (
      <Screen>
        <ScreenHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: 16 }}>
          <AlertCircle size={40} color={colors.coral} strokeWidth={1.6} />
          <Text style={{ color: colors.text, fontFamily: typography.display, fontSize: 20, textAlign: 'center' }}>
            Can't reach the laptop server
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            {(error as Error | null)?.message || 'The backend is unreachable.'}{'\n'}
            Check that FastAPI is running and the Wi-Fi address in Settings → Server matches this laptop.
          </Text>
          <GradientButton label="Retry" icon={<RotateCcw size={17} color="#06251F" strokeWidth={2.2} />} onPress={() => refetchGroups()} />
          <Pressable hitSlop={10} onPress={() => router.push('/(tabs)/settings')}>
            <Text style={{ color: colors.mint, fontFamily: typography.bodyMedium, fontSize: 13 }}>Open Settings → Server</Text>
          </Pressable>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenHeader flatName={group?.name} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ---- Position hero ---------------------------------------------- */}
          <LinearGradient
            colors={['#2DD4BF', '#17A491']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius.xl, padding: 18, overflow: 'hidden' }}
          >
            <View pointerEvents="none" style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', right: 34, bottom: -44, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(6,37,31,0.10)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: 'rgba(6,37,31,0.72)', fontFamily: typography.bodySemi, fontSize: 10, letterSpacing: 1.6 }}>
                YOUR POSITION
              </Text>
              <View style={{ backgroundColor: 'rgba(6,37,31,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#06251F', fontFamily: typography.bodySemi, fontSize: 10.5 }}>{currency}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ color: '#06251F', fontFamily: typography.displayBold, fontSize: 30, fontVariant: ['tabular-nums'], flexShrink: 1 }}>
                {identityId && myBalance
                  ? `${myNet > EPSILON ? '+' : myNet < -EPSILON ? '-' : ''}${formatMoney(Math.abs(myNet).toFixed(2), currency)}`
                  : '—'}
              </Text>
              <Wallet size={30} color="rgba(6,37,31,0.55)" strokeWidth={1.6} />
            </View>
            <Text style={{ color: 'rgba(6,37,31,0.82)', fontFamily: typography.bodyMedium, fontSize: 12, marginTop: 4 }}>
              {heroSubline}
            </Text>
          </LinearGradient>

          {/* ---- AI workspace ---------------------------------------------- */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View>
                <Text style={{ color: colors.textFaint, fontFamily: typography.bodySemi, fontSize: 10, letterSpacing: 1.6 }}>ASK AI</Text>
                <Text style={{ color: colors.text, fontFamily: typography.display, fontSize: 17.5, marginTop: 2 }}>Describe the expense</Text>
              </View>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.mintSoft, borderColor: colors.mintLine, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color={colors.mint} strokeWidth={1.7} />
              </View>
            </View>

            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={PLACEHOLDERS[placeholderIndex]}
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={4000}
              editable={!parsing}
              style={[inputStyle, {
                minHeight: 72, textAlignVertical: 'top', paddingTop: 14, fontSize: 15.5, lineHeight: 22,
              }]}
            />
            <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 10.5, alignSelf: 'flex-end', marginTop: 4 }}>
              {prompt.length}/4000
            </Text>

            <Text style={[fieldLabel, { marginTop: 4 }]}>I am</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {members.map((member) => (
                <Chip
                  key={member.id}
                  label={member.name}
                  selected={identityId === member.id}
                  onPress={() => setIdentity(groupId as number, member.id)}
                />
              ))}
            </ScrollView>

            {parsing ? (
              <View style={{ marginTop: 6 }}>
                <AiOrb label="Reading your expense…" />
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    cancelParseRef.current = true
                    aiMutation.reset()
                  }}
                  style={{ alignSelf: 'center' }}
                >
                  <Text style={{ color: colors.textMuted, fontFamily: typography.bodyMedium, fontSize: 12.5, paddingVertical: 4 }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ marginTop: 14, gap: 12 }}>
                <GradientButton
                  label="Understand with AI"
                  icon={<ArrowRight size={17} color="#06251F" strokeWidth={2.2} />}
                  onPress={() => prompt.trim() && groupId != null && aiMutation.mutate(prompt.trim())}
                  disabled={!prompt.trim() || groupId == null || members.length === 0}
                />
                <Pressable hitSlop={8} onPress={() => setManualMode((v) => !v)} style={{ alignSelf: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontFamily: typography.bodyMedium, fontSize: 12.5, paddingVertical: 2 }}>
                    {manualMode ? 'Hide manual entry' : 'Or add it manually'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* manual equal split */}
            {manualMode && !parsing && (
              <View style={{ gap: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: 12 }}>
                <TextInput
                  value={manualDesc}
                  onChangeText={setManualDesc}
                  placeholder="What was bought?"
                  placeholderTextColor={colors.textFaint}
                  maxLength={250}
                  style={inputStyle}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    value={manualAmount}
                    onChangeText={(v) => setManualAmount(v.replace(',', '.'))}
                    placeholder={`Amount (${currency})`}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    style={[inputStyle, { flex: 1, fontVariant: ['tabular-nums'] }]}
                  />
                  <View style={{ flex: 1 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {members.map((m) => (
                        <Chip key={m.id} label={m.name} selected={effectiveManualPayer === m.id} onPress={() => setManualPayer(m.id)} />
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 10.5 }}>
                  Equal split among all flatmates · {dateLabel(todayISO())}
                </Text>
                <GradientButton
                  compact
                  label={saveMutation.isPending && savingIndex == null ? 'Saving…' : 'Add expense'}
                  onPress={submitManualExpense}
                  loading={saveMutation.isPending && savingIndex == null}
                />
              </View>
            )}
          </Card>

          {/* ---- Drafts ------------------------------------------------------ */}
          {drafts.length > 0 && (
            <View style={{ gap: 12 }}>
              <SectionHeader
                eyebrow="Review before saving"
                title={`${drafts.length} draft${drafts.length === 1 ? '' : 's'}`}
                right={
                  <Pressable hitSlop={8} onPress={() => setDrafts([])}>
                    <Text style={{ color: colors.coral, fontFamily: typography.bodyMedium, fontSize: 12.5 }}>Discard all</Text>
                  </Pressable>
                }
              />
              {drafts.map((draft, index) => (
                <DraftCard
                  key={draft.client_request_id}
                  draft={draft}
                  index={index}
                  currency={currency}
                  members={members}
                  problem={draftProblem(draft, memberIds)}
                  saving={savingIndex === index}
                  onPatch={(patch) => updateDraft(index, patch)}
                  onToggleParticipant={(userId) => toggleParticipant(index, userId)}
                  onUpdateItem={(itemIndex, patch) => updateDraftItem(index, itemIndex, patch)}
                  onSplitTypeChange={(mode) => changeSplitType(index, mode)}
                  onConfirm={() => confirmDraft(index)}
                  onDiscard={() => setDrafts((current) => current.filter((_, i) => i !== index))}
                />
              ))}
              <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11, textAlign: 'center' }}>
                Nothing is saved until you confirm. Edit anything above — the server re-validates on save.
              </Text>
            </View>
          )}

          {/* ---- Recent activity --------------------------------------------- */}
          <View>
            <SectionHeader
              eyebrow="Recent activity"
              right={
                <Pressable hitSlop={8} onPress={() => router.push('/(tabs)/activity')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ color: colors.mint, fontFamily: typography.bodySemi, fontSize: 12.5 }}>View all</Text>
                  <ChevronRight size={15} color={colors.mint} strokeWidth={2} />
                </Pressable>
              }
            />
            {recent.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
                <Receipt size={22} color={colors.textFaint} strokeWidth={1.5} />
                <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 12.5, marginTop: 10, textAlign: 'center' }}>
                  No activity yet — describe your first expense above.
                </Text>
              </Card>
            ) : (
              <Card style={{ paddingVertical: 4 }}>
                {recent.map((row, i) => {
                  const isExpense = row.kind === 'expense'
                  const e = row.item as Expense
                  const s = row.item as Settlement
                  const title = isExpense ? e.description || 'Expense' : `${nameFor(s.from_user_id)} → ${nameFor(s.to_user_id)}`
                  const sub = isExpense
                    ? `${nameFor(e.paid_by)} paid · ${dateLabel(e.expense_date)}`
                    : `Settlement · ${dateLabel(String(s.settled_at).slice(0, 10))}`
                  const amount = isExpense ? e.total_amount : s.amount
                  return (
                    <Pressable
                      key={row.key}
                      onPress={() => isExpense ? router.push(`/expense/${e.id}`) : router.push('/(tabs)/activity')}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
                        borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.lineSoft, opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isExpense ? colors.mintSoft : colors.surfaceHighlight, borderWidth: 1, borderColor: isExpense ? colors.mintLine : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                        {isExpense
                          ? <Receipt size={16} color={colors.mint} strokeWidth={1.8} />
                          : <ArrowDownUp size={16} color={colors.amber} strokeWidth={1.8} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: colors.text, fontFamily: typography.bodyMedium, fontSize: 13 }}>{title}</Text>
                        <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11, marginTop: 2 }}>{sub}</Text>
                      </View>
                      <Text style={{ color: isExpense ? colors.text : colors.amber, fontFamily: typography.bodySemi, fontSize: 12.5, fontVariant: ['tabular-nums'] }}>
                        {formatMoney(amount, currency)}
                      </Text>
                    </Pressable>
                  )
                })}
              </Card>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
