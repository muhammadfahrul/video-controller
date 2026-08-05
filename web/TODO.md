# TODO: Update PWA to match web_reference (glass morphism design)

## Steps

- [x] 1. Update `layouts/MainLayout.tsx` - Add AppHeader, glass-shell container
- [x] 2. Update `layouts/Footer.tsx` - Glass gradient, uppercase labels
- [x] 3. Update `features/player/components/ControlButton.tsx` - Glass style
- [x] 4. Create `features/player/components/AtmosphereEffect.tsx` - Applause effect
- [x] 5. Update `features/player/components/PlayerControls.tsx` - Add atmosphere, 8-col grid
- [x] 6. Update `features/player/components/CurrentVideo.tsx` - Glass gradient style
- [x] 7. Update `features/player/components/ProgressBar.tsx` - Glass style
- [x] 8. Update `features/player/components/VolumeSlider.tsx` - Glass style with +/- buttons
- [x] 9. Update `features/player/components/PlayerStatus.tsx` - Glass style
- [x] 10. Update `services/player/PlayerCommand.ts` - Add ATMOSPHERE type
- [x] 11. Update `services/player/PlayerCommandService.ts` - Add atmosphere() method
- [x] 12. Update `store/appStore.ts` - Add atmosphere processing key
- [x] 13. Update `shared/components/Card.tsx` - Glass-card style
- [x] 14. Update `shared/components/FullPageLoading.tsx` - Glass style
- [x] 15. Update `shared/components/AgentOfflineOverlay.tsx` - Glass style
- [x] 16. Update `shared/components/MenuLink.tsx` - Match reference (react-router Link)
- [x] 17. Update `features/search/components/SearchBar.tsx` - Glass style
- [x] 18. Update `features/search/components/SearchResultCard.tsx` - Glass style
- [x] 19. Update `features/playlist/components/PlaylistPanel.tsx` - Glass style
- [x] 20. Update `features/playlist/components/PlaylistItem.tsx` - Glass style
- [x] 21. Update `features/playlist/components/PlaylistToolbar.tsx` - Glass style
- [x] 22. Update `features/playlist/components/PlaylistEmpty.tsx` - Glass style
- [x] 23. Update `features/agent/components/AgentStatusCard.tsx` - Glass style + atmosphere
- [x] 24. Update `pages/HomePage.tsx` - Grid layout with VolumeSlider
- [x] 25. Update `pages/PlaylistPage.tsx` - Match reference
- [x] 26. Update `pages/SearchPage.tsx` - Match reference
- [x] 27. Update `pages/SettingsPage.tsx` - Match reference
- [x] 28. Update `shared/components/Pagination.tsx` - Match reference style
- [x] 29. Update `services/search/SearchService.ts` - Add AbortSignal support
- [x] 30. Run `npm run build` to verify compilation
