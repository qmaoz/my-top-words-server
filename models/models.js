const { DataTypes } = require('sequelize');

const sequelize = require('../db');

const User = sequelize.define('users',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    preferred_translation_locale: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'en',
    },
    ui_locale: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'en',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: false,
    tableName: 'users',
    scopes: {
      withoutPassword: {
        attributes: { exclude: ['password'] }
      }
    }
  },
);

const Word = sequelize.define('words',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    word_text: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Legacy columns kept nullable for backward compatibility and rollback safety.
    // The source of truth for translations is now the `word_translations` table.
    word_translation_uk: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sentence_text: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sentence_translation_uk: {
      type: DataTypes.STRING,
      allowNull: true
    },
  },
  {
    timestamps: false,
    tableName: 'words'
  },
);

const WordTranslation = sequelize.define('word_translations',
  {
    word_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'words',
        key: 'id'
      }
    },
    locale: {
      type: DataTypes.STRING(8),
      primaryKey: true,
    },
    word_translation: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sentence_translation: {
      type: DataTypes.STRING,
      allowNull: false
    },
  },
  {
    timestamps: false,
    tableName: 'word_translations'
  },
);

const WordSet = sequelize.define('word-sets',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    visibility: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'private',
    },
    source_locale: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'de',
    },
    translation_locales: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ['uk'],
    },
    owner_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: false,
    tableName: 'word_sets'
  },
);

const WordsWordSets = sequelize.define('words__word_sets',
  {
    word_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'words',
        key: 'id'
      }
    },
    word_set_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'word_sets',
        key: 'id'
      }
    },
  },
  {
    timestamps: false,
    tableName: 'words__word_sets'
  },
);

const UsersWordSets = sequelize.define('users__word_sets',
  {},
  {
    timestamps: false,
    tableName: 'users__word_sets'
  },
);

const LearnedUserWords = sequelize.define('learned_user_words',
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    word_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'words',
        key: 'id'
      }
    },
  },
  {
    timestamps: false,
    tableName: 'learned_user_words'
  },
);

// Spaced-repetition progress: next_at null = in progress / due now;
// next_at in the future = deferred until that time; stage 0..5.
const UserWordProgress = sequelize.define('user_word_progress',
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    word_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'words',
        key: 'id',
      },
    },
    next_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    stage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: false,
    tableName: 'user_word_progress',
  },
);

const FeedbackMessage = sequelize.define('feedback_messages',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    page_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'queued',
    },
    admin_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'feedback_messages',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

const WordSetRemark = sequelize.define('word_set_remarks',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    word_set_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'word_sets',
        key: 'id',
      },
    },
    reporter_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    word_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'words',
        key: 'id',
      },
    },
    selected_text: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'queued',
    },
    owner_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'word_set_remarks',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);



User.hasMany(Word, {
  foreignKey: 'owner_user_id'
});
Word.belongsTo(User, {
  foreignKey: 'owner_user_id',
  as: 'wordOwnerInfo',
  onDelete: 'CASCADE'
});

User.hasMany(WordSet, {
  foreignKey: 'owner_user_id',
  allowNull: false,
});
WordSet.belongsTo(User, {
  foreignKey: {
    name: 'owner_user_id',
    allowNull: false,
  },
  as: 'wordSetOwnerInfo',
  onDelete: 'CASCADE'
});

User.belongsToMany(WordSet, {
  through: UsersWordSets,
  foreignKey: 'user_id',
  as: 'userWordSets',
  onDelete: 'CASCADE'
});
WordSet.belongsToMany(User, {
  through: UsersWordSets,
  foreignKey: 'word_set_id',
  as: 'wordSetUsers',
  onDelete: 'CASCADE'
});

Word.belongsToMany(WordSet, {
  through: WordsWordSets,
  foreignKey: 'word_id',
  as: 'wordWordSets',
  onDelete: 'CASCADE'
});
WordSet.belongsToMany(Word, {
  through: WordsWordSets,
  foreignKey: 'word_set_id',
  as: 'wordSetWords',
  onDelete: 'CASCADE'
});

User.belongsToMany(Word, {
  through: LearnedUserWords,
  foreignKey: 'user_id',
  as: 'learnedWords',
  onDelete: 'CASCADE'
});
Word.belongsToMany(User, {
  through: LearnedUserWords,
  foreignKey: 'word_id',
  as: 'learnedByUsers',
  onDelete: 'CASCADE'
});

User.belongsToMany(Word, {
  through: UserWordProgress,
  foreignKey: 'user_id',
  as: 'wordProgress',
  onDelete: 'CASCADE',
});
Word.belongsToMany(User, {
  through: UserWordProgress,
  foreignKey: 'word_id',
  as: 'progressByUsers',
  onDelete: 'CASCADE',
});

Word.hasMany(WordTranslation, {
  foreignKey: 'word_id',
  as: 'translations',
  onDelete: 'CASCADE',
});
WordTranslation.belongsTo(Word, {
  foreignKey: 'word_id',
  onDelete: 'CASCADE',
});

User.hasMany(FeedbackMessage, {
  foreignKey: 'user_id',
  onDelete: 'SET NULL',
});
FeedbackMessage.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'author',
  onDelete: 'SET NULL',
});

WordSet.hasMany(WordSetRemark, {
  foreignKey: 'word_set_id',
  as: 'remarks',
  onDelete: 'CASCADE',
});
WordSetRemark.belongsTo(WordSet, {
  foreignKey: 'word_set_id',
  as: 'wordSet',
  onDelete: 'CASCADE',
});

User.hasMany(WordSetRemark, {
  foreignKey: 'reporter_user_id',
  onDelete: 'SET NULL',
});
WordSetRemark.belongsTo(User, {
  foreignKey: 'reporter_user_id',
  as: 'reporter',
  onDelete: 'SET NULL',
});

Word.hasMany(WordSetRemark, {
  foreignKey: 'word_id',
  onDelete: 'SET NULL',
});
WordSetRemark.belongsTo(Word, {
  foreignKey: 'word_id',
  as: 'word',
  onDelete: 'SET NULL',
});



const { normalizeVisibility } = require('../utils/wordSetVisibility');
const { normalizeSourceLocale, normalizeTranslationLocales } = require('../utils/locales');

WordSet.prototype.toJSON = function () {
  const values = { ...this.get() };
  
  if (!values?.wordSetOwnerInfo) {
    delete values.wordSetOwnerInfo;
  }
  
  if (values.is_public == null) {
    values.is_public = false;
  }

  values.visibility = normalizeVisibility(values);
  values.is_public = values.visibility === 'public';

  values.source_locale = normalizeSourceLocale(values.source_locale);
  values.translation_locales = normalizeTranslationLocales(values.translation_locales);

  return values;
};



module.exports = {
  User, Word, WordTranslation, WordSet, WordsWordSets, UsersWordSets, LearnedUserWords, UserWordProgress, FeedbackMessage, WordSetRemark
};