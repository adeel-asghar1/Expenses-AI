import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View, Platform,
} from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check, Plus, Trash2, Pencil, Volume2, Wifi, WifiOff, Server, CircleAlert, CircleCheck,
  BellRing, Music2, Smartphone, Info,
} from 'lucide-react-native'

import {
  useActiveGroup, useGroupData, useInvalidateGroup, queryKeys,
} from '../../hooks/useGroupData'
import { useSettings, apiUrlProblem } from '../../state/settings'
import { useToast } from '../../state/toast'
import {
  addUser, renameUser, removeUser, createGroup, getHealth, getVersion,
} from '../../api'
import { playSound } from '../../lib/sounds'
import { haptic } from '../../lib/haptics'

import { Screen } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { Card } from '../../components/Card'
import { Chip } from '../../components/Chip'
import { Avatar } from '../../components/Avatar'
import { colors, radius, spacing, typography } from '../../design/tokens'
import { fieldLabel, inputStyle } from '../../design/styles'

type TestResult = { ok: boolean; text: string } | null

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const { group, groups } = useActiveGroup()
  const groupId = group?.id ?? null
  const { users, balances } = useGroupData(groupId)
  const invalidateGroup = useInvalidateGroup(groupId)

  const apiUrl = useSettings((s) => s.apiUrl)
  const setApiUrl = useSettings((s) => s.setApiUrl)
  const identityId = useSettings((s) => (groupId != null ? s.identities[groupId] : undefined))
  const setIdentity = useSettings((s) => s.setIdentity)
  const setSelectedGroupId = useSettings((s) => s.setSelectedGroupId)
  const soundsEnabled = useSettings((s) => s.soundsEnabled)
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled)
  const animationsEnabled = useSettings((s) => s.animationsEnabled)
  const notificationsEnabled = useSettings((s) => s.notificationsEnabled)
  const sounds = useSettings((s) => s.sounds)
  const setSoundsEnabled = useSettings((s) => s.setSoundsEnabled)
  const setHapticsEnabled = useSettings((s) => s.setHapticsEnabled)
  const setAnimationsEnabled = useSettings((s) => s.setAnimationsEnabled)
  const setNotificationsEnabled = useSettings((s) => s.setNotificationsEnabled)
  const setSound = useSettings((s) => s.setSound)
  const showToast = useToast((s) => s.show)

  const members = users.data ?? []
  const currency = balances.data?.currency ?? group?.currency ?? 'PKR'

  // flat creation
  const [newFlatName, setNewFlatName] = useState('')
  const createFlatMutation = useMutation({
    mutationFn: () => createGroup(newFlatName.trim() || 'My Flat'),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups })
      setSelectedGroupId(created.id)
      setNewFlatName('')
      showToast({ kind: 'success', title: 'Flat created', body: `"${created.name}" is ready. Add its flatmates below.` })
      haptic.success()
    },
    onError: (error: Error) => showToast({ kind: 'error', title: 'Not created', body: error.message }),
  })

  // flatmates management
  const [memberName, setMemberName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const addMemberMutation = useMutation({
    mutationFn: (name: string) => addUser(groupId as number, name),
    onSuccess: () => {
      invalidateGroup()
      setMemberName('')
      showToast({ kind: 'success', title: 'Flatmate added' })
      haptic.success()
    },
    onError: (error: Error) => showToast({ kind: 'error', title: 'Not added', body: error.message }),
  })
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameUser(id, name),
    onSuccess: () => {
      invalidateGroup()
      setEditingId(null)
      showToast({ kind: 'success', title: 'Flatmate renamed' })
    },
    onError: (error: Error) => showToast({ kind: 'error', title: 'Not renamed', body: error.message }),
  })
  const removeMutation = useMutation({
    mutationFn: (id: number) => removeUser(id),
    onSuccess: () => {
      invalidateGroup()
      setConfirmingId(null)
      showToast({ kind: 'success', title: 'Flatmate removed' })
      haptic.success()
    },
    onError: (error: Error) => {
      setConfirmingId(null)
      showToast({ kind: 'error', title: 'Not removed', body: error.message })
    },
  })

  // server configuration
  const [urlDraft, setUrlDraft] = useState(apiUrl)
  useEffect(() => setUrlDraft(apiUrl), [apiUrl])
  const [testResult, setTestResult] = useState<TestResult>(null)
  const urlProblem = apiUrlProblem(urlDraft)

  const testMutation = useMutation({
    mutationFn: async () => {
      const start = Date.now()
      await getHealth()
      const version = await getVersion().catch(() => null)
      return { ms: Date.now() - start, version: version?.version ?? null }
    },
    onSuccess: ({ ms, version }) => {
      setTestResult({
        ok: true,
        text: `Connected${version ? ` · API v${version}` : ''} · ${ms} ms`,
      })
      haptic.success()
    },
    onError: (error: Error) => {
      setTestResult({ ok: false, text: error.message })
      haptic.error()
    },
  })

  const saveUrl = () => {
    const problem = apiUrlProblem(urlDraft)
    if (problem) {
      showToast({ kind: 'error', title: 'Check the address', body: problem })
      return
    }
    setApiUrl(urlDraft)
    setTestResult(null)
    showToast({ kind: 'success', title: 'Server address updated', body: 'Reconnecting phones with the new address…' })
  }

  const switchToggle = (value: boolean, onValueChange: (v: boolean) => void, label: string, sub?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontFamily: typography.bodyMedium, fontSize: 13.5 }}>{label}</Text>
        {sub ? <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptic.selection()
          onValueChange(v)
        }}
        trackColor={{ false: colors.surfaceHighlight, true: colors.mintDeep }}
        thumbColor={Platform.OS === 'android' ? (value ? colors.mint : '#B9B6DE') : undefined}
        ios_backgroundColor={colors.surfaceHighlight}
      />
    </View>
  )

  return (
    <Screen>
      <ScreenHeader flatName={group?.name} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 34, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------- flat ---------------- */}
        <View>
          <SectionHeader eyebrow="Flat" title="Your group" />
          <Card style={{ gap: 10 }}>
            {groups.map((g) => {
              const active = g.id === groupId
              return (
                <Pressable
                  key={g.id}
                  onPress={() => {
                    setSelectedGroupId(g.id)
                    setConfirmingId(null)
                    setEditingId(null)
                    haptic.selection()
                  }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.85 : 1,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12,
                    borderColor: active ? colors.mintLine : colors.lineSoft,
                    backgroundColor: active ? colors.mintSoft : 'transparent',
                  })}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: active ? colors.mint : colors.textFaint, alignItems: 'center', justifyContent: 'center' }}>
                    {active ? <Check size={13} color={colors.mint} strokeWidth={3} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontFamily: typography.bodyMedium, fontSize: 14 }}>{g.name}</Text>
                    <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11 }}>{g.currency}</Text>
                  </View>
                </Pressable>
              )
            })}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              <TextInput
                value={newFlatName}
                onChangeText={setNewFlatName}
                placeholder="New flat name…"
                placeholderTextColor={colors.textFaint}
                maxLength={120}
                style={[inputStyle, { flex: 1 }]}
                onSubmitEditing={() => newFlatName.trim() && createFlatMutation.mutate()}
              />
              <Pressable
                onPress={() => newFlatName.trim() && createFlatMutation.mutate()}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, backgroundColor: colors.surfaceRaised, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line })}
              >
                {createFlatMutation.isPending ? <ActivityIndicator color={colors.mint} size="small" /> : <Plus size={20} color={colors.mint} strokeWidth={2} />}
              </Pressable>
            </View>
          </Card>
        </View>

        {/* ---------------- flatmates ---------------- */}
        {groupId != null && (
          <View>
            <SectionHeader eyebrow="Flatmates" title="Who lives here?" />
            <Card style={{ gap: 4 }}>
              {members.map((member) => {
                const confirmingThis = confirmingId === member.id
                const editingThis = editingId === member.id
                const isYou = identityId === member.id
                return (
                  <View key={member.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
                    {editingThis ? (
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TextInput
                          value={editName}
                          onChangeText={setEditName}
                          autoFocus
                          maxLength={100}
                          style={[inputStyle, { flex: 1, minHeight: 42 }]}
                          onSubmitEditing={() => editName.trim() && renameMutation.mutate({ id: member.id, name: editName.trim() })}
                        />
                        <Pressable onPress={() => editName.trim() && renameMutation.mutate({ id: member.id, name: editName.trim() })} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 8 })}>
                          <Check size={20} color={colors.mint} strokeWidth={2.2} />
                        </Pressable>
                        <Pressable onPress={() => setEditingId(null)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 8 })}>
                          <Text style={{ color: colors.textMuted, fontFamily: typography.bodyMedium, fontSize: 12 }}>Cancel</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Avatar name={member.name} size={36} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: colors.text, fontFamily: typography.bodyMedium, fontSize: 14 }} numberOfLines={1}>
                            {member.name}{isYou ? <Text style={{ color: colors.mint }}>  · you</Text> : null}
                          </Text>
                        </View>
                        <Pressable hitSlop={8} onPress={() => { setEditingId(member.id); setEditName(member.name); setConfirmingId(null) }} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}>
                          <Pencil size={16} color={colors.textMuted} strokeWidth={1.8} />
                        </Pressable>
                        <Pressable
                          hitSlop={8}
                          onPress={() => (confirmingThis ? removeMutation.mutate(member.id) : setConfirmingId(member.id))}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1, paddingHorizontal: confirmingThis ? 10 : 6, paddingVertical: 6, borderRadius: radius.sm,
                            backgroundColor: confirmingThis ? colors.coralSoft : 'transparent', borderWidth: confirmingThis ? 1 : 0, borderColor: colors.coral,
                          })}
                        >
                          {confirmingThis
                            ? <Text style={{ color: colors.coral, fontFamily: typography.bodySemi, fontSize: 11 }}>Confirm</Text>
                            : <Trash2 size={16} color={colors.coral} strokeWidth={1.8} />}
                        </Pressable>
                      </View>
                    )}
                  </View>
                )
              })}
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 10 }}>
                <TextInput
                  value={memberName}
                  onChangeText={setMemberName}
                  placeholder="New flatmate's name…"
                  placeholderTextColor={colors.textFaint}
                  maxLength={100}
                  style={[inputStyle, { flex: 1, minHeight: 46 }]}
                  onSubmitEditing={() => memberName.trim() && addMemberMutation.mutate(memberName.trim())}
                />
                <Pressable
                  onPress={() => memberName.trim() && addMemberMutation.mutate(memberName.trim())}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, backgroundColor: colors.surfaceRaised, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line })}
                >
                  {addMemberMutation.isPending ? <ActivityIndicator color={colors.mint} size="small" /> : <Plus size={20} color={colors.mint} strokeWidth={2} />}
                </Pressable>
              </View>
              <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 10.5, marginTop: 8 }}>
                Flatmates with financial history can't be removed — their records anchor the balances.
              </Text>
            </Card>
          </View>
        )}

        {/* ---------------- identity ---------------- */}
        {groupId != null && (
          <View>
            <SectionHeader eyebrow="Identity" title="Who are you on this phone?" />
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {members.map((m) => (
                  <Chip key={m.id} label={m.name} selected={identityId === m.id} onPress={() => setIdentity(groupId, m.id)} />
                ))}
              </View>
              <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11, lineHeight: 16 }}>
                This is only a display choice for this phone — used for the AI speaker, your hero totals and settlement defaults. It is not authentication: anyone on the Wi-Fi can open the app. Don't share these details outside your flat.
              </Text>
            </Card>
          </View>
        )}

        {/* ---------------- server ---------------- */}
        <View>
          <SectionHeader eyebrow="Server" title="Laptop connection" />
          <Card style={{ gap: 12 }}>
            <TextInput
              value={urlDraft}
              onChangeText={setUrlDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://192.168.1.10:8000"
              placeholderTextColor={colors.textFaint}
              style={inputStyle}
            />
            {urlProblem ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <CircleAlert size={15} color={colors.amber} strokeWidth={2} style={{ marginTop: 1 }} />
                <Text style={{ color: colors.amber, fontFamily: typography.body, fontSize: 11.5, flex: 1, lineHeight: 17 }}>{urlProblem}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={saveUrl}
                style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.mintLine, backgroundColor: colors.mintSoft, paddingVertical: 12, alignItems: 'center' })}
              >
                <Text style={{ color: colors.mint, fontFamily: typography.bodySemi, fontSize: 13 }}>Save address</Text>
              </Pressable>
              <Pressable
                onPress={() => testMutation.mutate()}
                style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceAlt, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 })}
              >
                {testMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.mint} />
                ) : (
                  <>
                    <Wifi size={15} color={colors.text} strokeWidth={1.8} />
                    <Text style={{ color: colors.text, fontFamily: typography.bodyMedium, fontSize: 13 }}>Test connection</Text>
                  </>
                )}
              </Pressable>
            </View>
            {testResult ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {testResult.ok
                  ? <CircleCheck size={16} color={colors.good} strokeWidth={2} />
                  : <WifiOff size={16} color={colors.coral} strokeWidth={2} />}
                <Text style={{ color: testResult.ok ? colors.good : colors.coral, fontFamily: typography.bodyMedium, fontSize: 12, flex: 1 }}>
                  {testResult.text}
                </Text>
              </View>
            ) : null}
            <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11, lineHeight: 17 }}>
              Phones talk to the FastAPI backend on your laptop — Ollama never leaves the laptop. Find the address with ipconfig → “IPv4 Address” (this Wi-Fi network), e.g. 10.168.226.205. The laptop and all three phones must be on the same Wi-Fi, and port 8000 must be allowed in the Windows Firewall.
            </Text>
          </Card>
        </View>

        {/* ---------------- preferences ---------------- */}
        <View>
          <SectionHeader eyebrow="Preferences" title="Sound, haptics & notifications" />
          <Card>
            {switchToggle(soundsEnabled, setSoundsEnabled, 'Sound effects', 'Master switch for all UI sounds')}
            <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 6 }}>
              {([
                ['save', 'Save'],
                ['notify', 'Notify'],
                ['error', 'Error'],
                ['tap', 'Tap'],
              ] as const).map(([kind, label]) => (
                <Pressable
                  key={kind}
                  onPress={() => {
                    setSound(kind, !sounds[kind])
                    if (!sounds[kind]) {
                      // turning it on: let the user hear it immediately
                      setTimeout(() => playSound(kind), 60)
                    }
                  }}
                  onLongPress={() => playSound(kind)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.75 : 1,
                    borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
                    borderColor: sounds[kind] ? colors.mintLine : colors.line,
                    backgroundColor: sounds[kind] ? colors.mintSoft : colors.surfaceAlt,
                  })}
                >
                  <Volume2 size={13} color={sounds[kind] ? colors.mint : colors.textFaint} strokeWidth={2} />
                  <Text style={{ color: sounds[kind] ? colors.mint : colors.textFaint, fontFamily: typography.bodyMedium, fontSize: 11.5 }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: colors.lineSoft }} />
            {switchToggle(hapticsEnabled, setHapticsEnabled, 'Haptic feedback', 'Tactile feedback on saves, tabs and errors')}
            <View style={{ height: 1, backgroundColor: colors.lineSoft }} />
            {switchToggle(animationsEnabled, setAnimationsEnabled, 'Animations', 'Motion effects across the app')}
            <View style={{ height: 1, backgroundColor: colors.lineSoft }} />
            {switchToggle(notificationsEnabled, setNotificationsEnabled, 'Notifications', 'When the app is backgrounded but alive — e.g. you switch to another app mid-check. Closed-app push needs FCM/APNs; see mobile/README.md.')}
          </Card>
        </View>

        {/* ---------------- about ---------------- */}
        <View>
          <SectionHeader eyebrow="About" title="Flat Expense Manager" />
          <Card style={{ gap: 12 }}>
            {[
              [<Smartphone key="i" size={16} color={colors.mint} strokeWidth={1.8} />, 'Version', 'App 1.0.0 · API compatible (FastAPI 2.1.0)'],
              [<Server key="s" size={16} color={colors.mint} strokeWidth={1.8} />, 'Local-first', 'Everything runs on your laptop: API, database and Ollama (llama3.2). No cloud, no subscriptions.'],
              [<BellRing key="n" size={16} color={colors.mint} strokeWidth={1.8} />, 'Notifications', 'Live updates arrive over Wi-Fi while the app is open. When closed, no push arrives without FCM/APNs.'],
              [<Music2 key="m" size={16} color={colors.mint} strokeWidth={1.8} />, 'Sounds', 'Original synthesized chimes — no third-party audio.'],
            ].map(([icon, label, body], i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ marginTop: 2 }}>{icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: typography.bodySemi, fontSize: 12.5 }}>{label}</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 11.5, lineHeight: 17, marginTop: 2 }}>{body}</Text>
                </View>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.lineSoft }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Info size={14} color={colors.textFaint} strokeWidth={1.8} />
              <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 10.5, flex: 1, lineHeight: 15 }}>
                MIT license · Built for a three-person flat · Not an authentication system — see README.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  )
}
