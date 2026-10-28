// Emscripten import called by Rust after completing solver work.
mergeInto(LibraryManager.library, {
  vdf_report_progress: function (phase, completedLo, completedHi) {
    if (Module['onVdfProgress']) Module['onVdfProgress'](phase, completedLo, completedHi);
  },
});
