import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { AlertCircle, CheckCircle2, Trash2, Plus } from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import type { Draft, DraftItem, Flatmate } from '../types'
import { Card } from './Card'
import { Chip } from './Chip'
import { GradientButton } from './GradientButton'
import { colors, radius, spacing, typography } from '../design/tokens'
import { fieldLabel, inputStyle } from '../design/styles'
import { allocationCheck } from '../lib/drafts'
import { todayISO } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { haptic } from '../lib/haptics'

/** Fully editable AI draft. Nothing is saved until the user confirms. */
export function DraftCard({
  draft, index, currency, members, problem, saving,
  onPatch, onToggleParticipant, onUpdateItem, onSplitTypeChange, onConfirm, onDiscard,
}: {
  draft: Draft
  index: number
  currency: string
  members: Flatmate[]
  problem: string | null
  saving: boolean
  onPatch: (patch: Partial<Draft>) => void
  onToggleParticipant: (userId: number) => void
  onUpdateItem: (itemIndex: number, patch: Partial<DraftItem>) => void
  onSplitTypeChange: (mode: 'equal' | 'items') => void
  onConfirm: () => void
  onDiscard: () => void
}) {
  const allocation = allocationCheck(draft)

  return (
    <Animated.View entering={FadeInUp.duration(340)}>
      <Card raised style={{ gap: spacing.md, borderColor: colors.mintLine }}>
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.mint, fontFamily: typography.bodySemi, fontSize: 10.5, letterSpacing: 1.6 }}>
            DRAFT {index + 1}
          </Text>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
              backgroundColor: problem ? colors.amberSoft : colors.mintSoft,
              borderColor: problem ? colors.amberLine : colors.mintLine, borderWidth: 1,
            }}
          >
            {problem
              ? <AlertCircle size={12} color={colors.amber} strokeWidth={2} />
              : <CheckCircle2 size={12} color={colors.mint} strokeWidth={2} />}
            <Text style={{ color: problem ? colors.amber : colors.mint, fontFamily: typography.bodySemi, fontSize: 10.5, letterSpacing: 1 }}>
              {problem ? 'NEEDS REVIEW' : 'READY'}
            </Text>
          </View>
        </View>

        {/* issues */}
        {draft.issues.length > 0 && (
          <View style={{ gap: 6, backgroundColor: colors.amberSoft, borderColor: colors.amberLine, borderWidth: 1, borderRadius: radius.md, padding: 10 }}>
            {draft.issues.map((issue, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={14} color={colors.amber} strokeWidth={2} style={{ marginTop: 1 }} />
                <Text style={{ color: colors.amber, fontFamily: typography.body, fontSize: 12, lineHeight: 17, flex: 1 }}>
                  {issue}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* description */}
        <View>
          <Text style={fieldLabel}>Description</Text>
          <TextInput
            value={draft.description}
            onChangeText={(v) => onPatch({ description: v })}
            placeholder="What was bought?"
            placeholderTextColor={colors.textFaint}
            maxLength={250}
            style={inputStyle}
          />
        </View>

        {/* amount + date */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1.2 }}>
            <Text style={fieldLabel}>Total ({currency})</Text>
            <TextInput
              value={draft.total_amount}
              onChangeText={(v) => onPatch({ total_amount: v.replace(',', '.') })}
              placeholder="0.00"
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              style={[inputStyle, { fontVariant: ['tabular-nums'] }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={fieldLabel}>Date</Text>
            <TextInput
              value={draft.date}
              onChangeText={(v) => onPatch({ date: v })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              maxLength={10}
              style={inputStyle}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: -6 }}>
          {[['Today', 0], ['Yesterday', -1]].map(([label, offset]) => (
            <Pressable
              key={String(label)}
              hitSlop={6}
              onPress={() => { haptic.selection(); onPatch({ date: todayISO(Number(offset)) }) }}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ color: colors.mint, fontFamily: typography.bodyMedium, fontSize: 11.5 }}>
                {String(label)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* payer */}
        <View>
          <Text style={fieldLabel}>Paid by</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {members.map((m) => (
              <Chip
                key={m.id}
                label={m.name}
                selected={draft.paid_by_user_id === String(m.id)}
                onPress={() => onPatch({ paid_by_user_id: String(m.id) })}
              />
            ))}
          </ScrollView>
        </View>

        {/* split mode segmented control */}
        <View>
          <Text style={fieldLabel}>Split</Text>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, borderColor: colors.line, borderWidth: 1 }}>
            {([['equal', 'Equally'], ['items', 'Custom amounts']] as const).map(([mode, label]) => {
              const active = draft.split_type === mode
              return (
                <Pressable
                  key={mode}
                  onPress={() => onSplitTypeChange(mode)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center',
                    backgroundColor: active ? colors.surfaceHighlight : 'transparent',
                    borderWidth: active ? 1 : 0, borderColor: colors.mintLine,
                  }}
                >
                  <Text style={{ color: active ? colors.mint : colors.textMuted, fontFamily: typography.bodySemi, fontSize: 12.5 }}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* equal: participants */}
        {draft.split_type === 'equal' && (
          <View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {members.map((m) => (
                <Chip
                  key={m.id}
                  label={m.name}
                  selected={draft.participant_ids.includes(m.id)}
                  onPress={() => onToggleParticipant(m.id)}
                />
              ))}
            </View>
            <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 8, fontFamily: typography.body }}>
              Split equally among selected flatmates. Unchecked flatmates pay nothing.
            </Text>
          </View>
        )}

        {/* items: per-person amounts */}
        {draft.split_type === 'items' && (
          <View style={{ gap: 10 }}>
            {draft.items.map((item, i) => (
              <View key={i} style={{ gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 10, borderColor: item.owner_user_id ? colors.line : colors.amberLine, borderWidth: 1 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={item.item_name}
                    onChangeText={(v) => onUpdateItem(i, { item_name: v })}
                    placeholder="Item"
                    placeholderTextColor={colors.textFaint}
                    maxLength={150}
                    style={[inputStyle, { flex: 1, minHeight: 42, paddingVertical: 9 }]}
                  />
                  <TextInput
                    value={item.amount}
                    onChangeText={(v) => onUpdateItem(i, { amount: v.replace(',', '.') })}
                    placeholder="0.00"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    style={[inputStyle, { width: 96, minHeight: 42, paddingVertical: 9, fontVariant: ['tabular-nums'] }]}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {members.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.name}
                      selected={item.owner_user_id === m.id}
                      onPress={() => onUpdateItem(i, { owner_user_id: m.id, owner_status: 'matched' })}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
            <Pressable
              onPress={() => onPatch({ items: [...draft.items, { item_name: '', owner_name: null, owner_user_id: null, owner_status: 'missing', amount: '' }] })}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 })}
            >
              <Plus size={15} color={colors.mint} strokeWidth={2} />
              <Text style={{ color: colors.mint, fontFamily: typography.bodyMedium, fontSize: 12 }}>Add item</Text>
            </Pressable>

            {/* allocation check */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: allocation.ok ? colors.good : colors.amber, fontFamily: typography.bodySemi, fontSize: 11.5, fontVariant: ['tabular-nums'] }}>
                  Items {formatMoney(allocation.sum.toFixed(2), currency)}
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 11.5, fontVariant: ['tabular-nums'] }}>
                  of {formatMoney(allocation.total.toFixed(2), currency)}
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceHighlight, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 6, borderRadius: 3,
                    width: `${allocation.total > 0 ? Math.min(100, (allocation.sum / allocation.total) * 100) : 0}%`,
                    backgroundColor: allocation.ok ? colors.good : colors.amber,
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {/* blocking problem line */}
        {problem ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} color={colors.coral} strokeWidth={2} />
            <Text style={{ color: colors.coral, fontFamily: typography.bodyMedium, fontSize: 12, flex: 1 }}>{problem}</Text>
          </View>
        ) : null}

        {/* actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={onDiscard} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 10 })}>
            <Trash2 size={19} color={colors.coral} strokeWidth={1.8} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <GradientButton
              compact
              label={saving ? 'Saving…' : 'Confirm & save'}
              onPress={onConfirm}
              loading={saving}
            />
          </View>
        </View>
      </Card>
    </Animated.View>
  )
}
