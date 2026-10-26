import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArtworkImage, Button, EmptyState, Icon, IconButton, TrackRow } from '@/components';
import { AddTracksToPlaylistModal } from '@/components/AddTracksToPlaylistModal';
import { catalog } from '@/services/catalog';
import type { ArtistProfile, CatalogArtist } from '@/services/catalog/types';
import { t, useTranslation } from '@/i18n';
import { playQueue } from '@/services/audio/controller';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';
import { Slider } from '@/components/spotify-clone/Slider';
import type { CardItem } from '@/components/spotify-clone/Card';

const HERO_HEIGHT = 370;
const INITIAL_TRACK_COUNT = 5;

export default function ArtistScreen() {
  useTranslation();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [candidates, setCandidates] = useState<CatalogArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [failedArtistId, setFailedArtistId] = useState<string | null>(null);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [showAddTracks, setShowAddTracks] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setCandidates([]);
    setLoading(true);
    setError(null);
    setFailedArtistId(null);
    setShowAllTracks(false);
    setDescriptionExpanded(false);

    const load = async () => {
      try {
        if (id !== 'search') {
          const result = await catalog.getArtist(id);
          if (active) setProfile(result);
          return;
        }

        const query = typeof name === 'string' ? name.trim() : '';
        if (!query) {
          setError(t('artist.notFound'));
          return;
        }
        const results = await catalog.searchArtists(query);
        if (!active) return;
        const exact = results.filter((artist) => artist.name.toLocaleLowerCase() === query.toLocaleLowerCase());
        if (exact.length === 1) {
          const result = await catalog.getArtist(exact[0].id);
          if (active) setProfile(result);
        } else if (results.length) {
          setCandidates(results);
        } else {
          setError(t('artist.notFound'));
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : t('artist.loadFailed'));
          if (id !== 'search') setFailedArtistId(id);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [id, name, retry]);

  const openArtist = async (artistId: string) => {
    setLoading(true);
    setError(null);
    setCandidates([]);
    setFailedArtistId(artistId);
    try {
      setProfile(await catalog.getArtist(artistId));
      setFailedArtistId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('artist.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const tracks = profile?.tracks.slice(0, INITIAL_TRACK_COUNT) ?? [];
  const relatedArtistItems: CardItem[] = (profile?.relatedArtists ?? []).map((artist) => ({
    id: artist.id,
    title: artist.name,
    subtitle: artist.subtitle,
    imageUrl: artist.imageUrl ?? undefined,
    onPress: () => router.push({ pathname: '/artist/[id]', params: { id: artist.id, name: artist.name } }),
  }));
  const collectionItems = (items: ArtistProfile['albums']): CardItem[] => items.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    imageUrl: item.imageUrl ?? undefined,
    onPress: () => {
      if (item.track) {
        void playQueue([item.track], 0);
        return;
      }
      router.push({
        pathname: '/collection/[id]',
        params: { id: item.id, kind: item.kind === 'playlist' ? 'playlist' : 'album' },
      });
    },
  }));

  const header = profile ? (
    <>
      <View style={s.hero}>
        {profile.imageUrl ? (
          <ArtworkImage uri={profile.imageUrl} style={s.heroImage} />
        ) : (
          <View style={[s.heroImage, s.heroPlaceholder]}>
            <Icon name="person" size={104} color="rgba(255,255,255,0.52)" />
          </View>
        )}
        <LinearGradient
          colors={['rgba(10,10,16,0.08)', 'rgba(10,10,16,0.18)', colors.bg]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.heroCopy, { paddingTop: insets.top + 76 }]}>
          <Text style={s.artistLabel}>{t('artist.profile')}</Text>
          <Text accessibilityRole="header" style={s.name}>{profile.name}</Text>
        </View>
      </View>
      <View style={s.profileContent}>
        {profile.subtitle ? <Text style={s.subtitle}>{profile.subtitle}</Text> : null}
        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.play')}
            disabled={!profile.tracks.length}
            onPress={() => playQueue(profile.tracks, 0)}
            style={[s.playButton, !profile.tracks.length && s.disabled]}
          >
            <Icon name="play" size={26} color={colors.accentText} />
          </Pressable>
          <Text style={s.sectionTitle}>{t('artist.topTracks')}</Text>
        </View>
        <Button
          label={t('artist.addAllTracks')}
          icon="add"
          onPress={() => setShowAddTracks(true)}
          disabled={!profile.tracks.length}
        />
        {profile.tracks.length > INITIAL_TRACK_COUNT ? (
          <Pressable accessibilityRole="button" onPress={() => setShowAllTracks(true)} hitSlop={8} style={s.showMore}>
            <Text style={s.showMoreText}>{t('artist.showAllTracks', { count: profile.tracks.length })}</Text>
          </Pressable>
        ) : null}
        {profile.description ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={descriptionExpanded ? t('artist.descriptionCollapse') : t('artist.descriptionExpand')}
            onPress={() => setDescriptionExpanded((expanded) => !expanded)}
            style={s.descriptionBlock}
          >
            <Text numberOfLines={descriptionExpanded ? undefined : 2} style={s.description}>{profile.description}</Text>
            <Text style={s.descriptionToggle}>
              {descriptionExpanded ? t('artist.descriptionCollapse') : t('artist.descriptionExpand')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </>
  ) : candidates.length ? (
    <View style={[s.candidates, { paddingTop: insets.top + 72 }]}>
      <Text style={s.chooseTitle}>{t('artist.chooseArtist')}</Text>
      <Text style={s.chooseHint}>{t('artist.chooseArtistHint')}</Text>
      {candidates.map((artist) => (
        <Pressable
          key={artist.id}
          accessibilityRole="button"
          onPress={() => void openArtist(artist.id)}
          style={({ pressed }) => [s.candidate, pressed && { opacity: 0.75 }]}
        >
          {artist.imageUrl
            ? <View style={s.candidateImageWrap}><ArtworkImage uri={artist.imageUrl} style={s.candidateImage} /></View>
            : <View style={[s.candidateImage, s.placeholder]}><Icon name="person" size={28} color={colors.textMuted} /></View>}
          <View style={s.candidateInfo}>
            <Text numberOfLines={1} style={s.candidateName}>{artist.name}</Text>
            <Text numberOfLines={1} style={s.candidateSubtitle}>{artist.subtitle || t('artist.profile')}</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  ) : null;

  return (
    <View style={s.root}>
      <FlatList
        data={tracks}
        keyExtractor={(track) => track.id}
        contentContainerStyle={{ paddingBottom: layout.listBottomPad }}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <TrackRow track={item} onPress={() => profile && playQueue(profile.tracks, index)} />
        )}
        ListEmptyComponent={
          loading
            ? <EmptyState loading message={t('common.loading')} />
            : error
              ? <EmptyState
                  message={error}
                  actionLabel={t('common.retry')}
                  onAction={() => failedArtistId ? void openArtist(failedArtistId) : setRetry((value) => value + 1)}
                />
              : profile
                ? <EmptyState message={t('artist.noSongs')} />
                : null
        }
        ListFooterComponent={profile ? (
          <View style={s.artistSections}>
            <Slider title={t('artist.albums')} items={collectionItems(profile.albums)} />
            <Slider title={t('artist.singles')} items={collectionItems(profile.singles)} />
            <Slider title={t('artist.eps')} items={collectionItems(profile.eps)} />
            <Slider title={t('artist.playlists')} items={collectionItems(profile.playlists)} />
            <Slider title={t('artist.relatedArtists')} items={relatedArtistItems} shape="circle" />
          </View>
        ) : null}
        showsVerticalScrollIndicator={false}
      />
      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon="chevron-back" filled label={t('common.back')} onPress={() => router.back()} />
      </View>
      {profile ? (
        <Modal visible={showAllTracks} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowAllTracks(false)}>
          <View style={[s.allTracksModal, { paddingTop: insets.top }]}>
            <View style={s.allTracksHeader}>
              <IconButton icon="chevron-back" filled label={t('common.back')} onPress={() => setShowAllTracks(false)} />
              <View style={s.allTracksTitleWrap}>
                <Text style={s.allTracksEyebrow}>{t('artist.topTracks')}</Text>
                <Text numberOfLines={1} style={s.allTracksTitle}>{profile.name}</Text>
              </View>
            </View>
            <FlatList
              data={profile.tracks}
              keyExtractor={(track) => track.id}
              renderItem={({ item, index }) => (
                <TrackRow
                  track={item}
                  onPress={() => {
                    void playQueue(profile.tracks, index);
                    setShowAllTracks(false);
                  }}
                />
              )}
              ListEmptyComponent={<EmptyState message={t('artist.noSongs')} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Modal>
      ) : null}
      {profile && showAddTracks ? (
        <AddTracksToPlaylistModal tracks={profile.tracks} onClose={() => setShowAddTracks(false)} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, paddingHorizontal: spacing.md },
  hero: { height: HERO_HEIGHT, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  heroImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  artistLabel: { color: colors.text, fontSize: font.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  name: { color: colors.text, fontSize: font.hero, lineHeight: 40, fontWeight: '900', marginTop: spacing.xs },
  profileContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  subtitle: { color: colors.textMuted, fontSize: font.sm, marginBottom: spacing.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  playButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  disabled: { opacity: 0.45 },
  sectionTitle: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  descriptionBlock: { marginBottom: spacing.md },
  description: { color: colors.textMuted, fontSize: font.sm, lineHeight: 18 },
  descriptionToggle: { color: colors.text, fontSize: font.sm, fontWeight: '700', marginTop: spacing.xs },
  showMore: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.sm },
  showMoreText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '700' },
  allTracksModal: { flex: 1, backgroundColor: colors.bg },
  allTracksHeader: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.md },
  allTracksTitleWrap: { flex: 1 },
  allTracksEyebrow: { color: colors.textMuted, fontSize: font.sm },
  allTracksTitle: { color: colors.text, fontSize: font.lg, fontWeight: '800' },
  artistSections: { paddingTop: spacing.lg },
  candidates: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  chooseTitle: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  chooseHint: { color: colors.textMuted, fontSize: font.md, marginTop: spacing.xs, marginBottom: spacing.md },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  candidateImage: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  candidateImageWrap: { width: 64, height: 64, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  candidateInfo: { flex: 1 },
  candidateName: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  candidateSubtitle: { color: colors.textMuted, fontSize: font.sm, marginTop: 2 },
});
