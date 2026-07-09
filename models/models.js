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
    word_translation_uk: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sentence_text: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sentence_translation_uk: {
      type: DataTypes.STRING,
      allowNull: false
    },
  },
  {
    timestamps: false,
    tableName: 'words'
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
    }
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



User.hasMany(Word, {
  foreignKey: 'owner_user_id'
});
Word.belongsTo(User, {
  foreignKey: 'owner_user_id',
  as: 'wordOwnerInfo',
  onDelete: 'CASCADE'
});

User.hasMany(WordSet, {
  foreignKey: 'owner_user_id'
});
WordSet.belongsTo(User, {
  foreignKey: 'owner_user_id',
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

User.hasMany(FeedbackMessage, {
  foreignKey: 'user_id',
  onDelete: 'SET NULL',
});
FeedbackMessage.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'author',
  onDelete: 'SET NULL',
});



WordSet.prototype.toJSON = function () {
  const values = { ...this.get() };
  
  if (!values?.wordSetOwnerInfo) {
    delete values.wordSetOwnerInfo;
  }
  
  if (values.is_public == null) {
    values.is_public = false;
  }

  return values;
};



module.exports = {
  User, Word, WordSet, WordsWordSets, UsersWordSets, LearnedUserWords, FeedbackMessage
};